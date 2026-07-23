/**
 * 拼豆图纸解码模块
 * 优先识别格子上的色号文字，失败再按色块匹配 MARD
 */

import { createWorker, type Worker } from 'tesseract.js'
import {
  FindMardColorByCode,
  FindMardColorByHex,
  MARDCOLORS,
  NormalizeHex,
  type MardColor,
} from '@/utils/MardColors'
import type { ColoredPixelGrid } from '@/utils/TextToPixels'

/** 网格布局 */
export type BlueprintGridLayout = {
  cols: number
  rows: number
  cellSize: number
  paddingX: number
  paddingY: number
}

/** 解码结果 */
export type BlueprintDecodeResult = {
  grid: ColoredPixelGrid
  labeledCount: number
  sampledCount: number
  emptyCount: number
  source: 'label' | 'mixed' | 'color'
}

type Rgb = { r: number; g: number; b: number }

const MARDCODESET = new Set(MARDCOLORS.map((item) => item.code.toUpperCase()))

/**
 * 解析 RGB
 * @param data ImageData
 * @param index 像素起点
 * @returns RGB
 */
function ReadRgb(data: Uint8ClampedArray, index: number): Rgb {
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
  }
}

/**
 * RGB 转 HEX
 * @param rgb RGB
 * @returns HEX
 */
function RgbToHex(rgb: Rgb): string {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * 颜色距离平方
 * @param left A
 * @param right B
 * @returns 距离平方
 */
function ColorDistanceSq(left: Rgb, right: Rgb): number {
  const dr = left.r - right.r
  const dg = left.g - right.g
  const db = left.b - right.b
  return dr * dr * 2 + dg * dg * 4 + db * db * 3
}

/**
 * 规范化 OCR 文本为可能的色号
 * @param text OCR 原文
 * @returns 色号或空串
 */
export function NormalizeOcrColorCode(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!cleaned) {
    return ''
  }
  const candidates = [
    cleaned,
    cleaned.replace(/O/g, '0'),
    cleaned.replace(/0/g, 'O'),
    cleaned.replace(/I/g, '1'),
    cleaned.replace(/1/g, 'I'),
    cleaned.replace(/Z/g, '2'),
    cleaned.replace(/S/g, '5'),
  ]
  for (const item of candidates) {
    if (MARDCODESET.has(item)) {
      return item
    }
  }
  return ''
}

/**
 * 从出图像素反推图纸行列（对齐 DrawBeadPattern：cellSize + padding）
 * @param imageWidth 图宽
 * @param imageHeight 图高
 * @returns 检测到的布局，失败返回 null
 */
export function DetectBlueprintDimensions(
  imageWidth: number,
  imageHeight: number,
): BlueprintGridLayout | null {
  let best: BlueprintGridLayout | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let cellSize = 28; cellSize <= 72; cellSize += 1) {
    const padding = Math.max(16, Math.round(cellSize * 0.8))
    const innerW = imageWidth - padding * 2
    const innerH = imageHeight - padding * 2
    if (innerW < cellSize || innerH < cellSize) {
      continue
    }
    const cols = Math.round(innerW / cellSize)
    const rows = Math.round(innerH / cellSize)
    if (cols < 4 || rows < 4 || cols > 256 || rows > 256) {
      continue
    }
    const expectW = cols * cellSize + padding * 2
    const expectH = rows * cellSize + padding * 2
    const score =
      Math.abs(expectW - imageWidth) + Math.abs(expectH - imageHeight)
    if (score < bestScore) {
      bestScore = score
      best = {
        cols,
        rows,
        cellSize,
        paddingX: padding,
        paddingY: padding,
      }
    }
  }

  if (!best || bestScore > 2) {
    return null
  }
  return best
}

/**
 * 根据目标行列与出图像素反推格子布局（对齐 DrawBeadPattern 公式）
 * @param imageWidth 图宽
 * @param imageHeight 图高
 * @param cols 列数
 * @param rows 行数
 * @returns 布局
 */
export function ResolveBlueprintLayout(
  imageWidth: number,
  imageHeight: number,
  cols: number,
  rows: number,
): BlueprintGridLayout {
  const safeCols = Math.max(1, Math.round(cols))
  const safeRows = Math.max(1, Math.round(rows))

  let best: BlueprintGridLayout | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let cellSize = 72; cellSize >= 16; cellSize -= 1) {
    const padding = Math.max(16, Math.round(cellSize * 0.8))
    const expectW = safeCols * cellSize + padding * 2
    const expectH = safeRows * cellSize + padding * 2
    const score =
      Math.abs(expectW - imageWidth) + Math.abs(expectH - imageHeight)
    if (score < bestScore) {
      bestScore = score
      best = {
        cols: safeCols,
        rows: safeRows,
        cellSize,
        paddingX: padding,
        paddingY: padding,
      }
    }
  }

  if (best && bestScore <= Math.max(imageWidth, imageHeight) * 0.08) {
    return best
  }

  // 回退：均分内容区，保留少量边距
  const paddingX = Math.max(8, Math.round(imageWidth * 0.04))
  const paddingY = Math.max(8, Math.round(imageHeight * 0.04))
  const cellW = (imageWidth - paddingX * 2) / safeCols
  const cellH = (imageHeight - paddingY * 2) / safeRows
  return {
    cols: safeCols,
    rows: safeRows,
    cellSize: Math.max(8, Math.min(cellW, cellH)),
    paddingX,
    paddingY,
  }
}

/**
 * 从格子四角采样主色（避开中心色号文字）
 * @param data 整图 ImageData
 * @param width 图宽
 * @param cellLeft 格左
 * @param cellTop 格上
 * @param cellSize 格边长
 * @returns RGB
 */
function SampleCellCornerColor(
  data: Uint8ClampedArray,
  width: number,
  cellLeft: number,
  cellTop: number,
  cellSize: number,
): Rgb {
  const inset = Math.max(2, Math.floor(cellSize * 0.12))
  const points = [
    [cellLeft + inset, cellTop + inset],
    [cellLeft + cellSize - inset - 1, cellTop + inset],
    [cellLeft + inset, cellTop + cellSize - inset - 1],
    [cellLeft + cellSize - inset - 1, cellTop + cellSize - inset - 1],
    [cellLeft + inset, cellTop + Math.floor(cellSize / 2)],
    [cellLeft + cellSize - inset - 1, cellTop + Math.floor(cellSize / 2)],
  ]
  const samples: Rgb[] = []
  for (const [x, y] of points) {
    const px = Math.max(0, Math.min(width - 1, Math.round(x)))
    const py = Math.max(
      0,
      Math.min(Math.floor(data.length / (width * 4)) - 1, Math.round(y)),
    )
    const index = (py * width + px) * 4
    if (data[index + 3] < 20) {
      continue
    }
    samples.push(ReadRgb(data, index))
  }
  if (!samples.length) {
    return { r: 247, g: 244, b: 239 }
  }
  // 取中位，抗文字像素干扰
  const rs = samples.map((item) => item.r).sort((a, b) => a - b)
  const gs = samples.map((item) => item.g).sort((a, b) => a - b)
  const bs = samples.map((item) => item.b).sort((a, b) => a - b)
  const mid = Math.floor(samples.length / 2)
  return { r: rs[mid], g: gs[mid], b: bs[mid] }
}

/**
 * 按色块匹配 MARD（先精确 HEX，再小阈值，再最近邻）
 * @param rgb 采样色
 * @returns MARD 色或 null（接近纸张底时视为空）
 */
function MatchColorBySample(rgb: Rgb): MardColor | null {
  const hex = RgbToHex(rgb)
  const exact = FindMardColorByHex(hex)
  if (exact) {
    return exact
  }

  let best: MardColor | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const item of MARDCOLORS) {
    const normalized = NormalizeHex(item.hex).replace('#', '')
    const target = {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    }
    const distance = ColorDistanceSq(rgb, target)
    if (distance < bestDistance) {
      bestDistance = distance
      best = item
    }
  }

  // 很接近纸张米色时视为空位
  const paper = { r: 247, g: 244, b: 239 }
  if (ColorDistanceSq(rgb, paper) < 900 && bestDistance > 400) {
    return null
  }

  return best
}

/**
 * 判断是否像背景空位色（浅色高频）
 * @param color MARD 色
 * @returns 是否背景
 */
function IsLikelyBackground(color: MardColor): boolean {
  const hex = NormalizeHex(color.hex).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000
  return luminance > 230 || color.code.toUpperCase() === 'T1'
}

/**
 * 使用 OCR 识别整张图纸上的色号，映射到格子
 * @param canvas 图纸画布
 * @param layout 网格布局
 * @returns 色号矩阵（空串表示未识别）
 */
async function RecognizeLabeledCodes(
  canvas: HTMLCanvasElement,
  layout: BlueprintGridLayout,
): Promise<string[][]> {
  const labels = Array.from({ length: layout.rows }, () =>
    Array.from({ length: layout.cols }, () => ''),
  )

  let worker: Worker | null = null
  try {
    worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    })
    const result = await worker.recognize(
      canvas,
      {},
      { text: true, blocks: true },
    )
    const words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> =
      []
    const blocks = result.data.blocks || []
    for (const block of blocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const word of line.words || []) {
            words.push(word)
          }
        }
      }
    }
    for (const word of words) {
      const code = NormalizeOcrColorCode(word.text || '')
      if (!code) {
        continue
      }
      const centerX = (word.bbox.x0 + word.bbox.x1) / 2
      const centerY = (word.bbox.y0 + word.bbox.y1) / 2
      const col = Math.floor((centerX - layout.paddingX) / layout.cellSize)
      const row = Math.floor((centerY - layout.paddingY) / layout.cellSize)
      if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) {
        continue
      }
      if (!labels[row][col]) {
        labels[row][col] = code
      }
    }
  } catch {
    // OCR 失败时交由色块回退
  } finally {
    if (worker) {
      await worker.terminate()
    }
  }

  return labels
}

/**
 * 解码拼豆图纸：优先色号标注，其次色块识别
 * @param image 图片
 * @param cols 列数（豆宽）
 * @param rows 行数（豆高）
 * @returns 解码结果
 */
export async function DecodeBeadBlueprint(
  image: HTMLImageElement,
  cols: number,
  rows: number,
): Promise<BlueprintDecodeResult> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, 0, 0)

  const layoutDetected = DetectBlueprintDimensions(canvas.width, canvas.height)
  const layout =
    layoutDetected ||
    ResolveBlueprintLayout(canvas.width, canvas.height, cols, rows)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const labels = await RecognizeLabeledCodes(canvas, layout)

  const cells: Array<Array<string | null>> = []
  const origins: Array<Array<'label' | 'color' | 'empty'>> = []
  let labeledCount = 0
  let sampledCount = 0
  let emptyCount = 0
  const codeCounter = new Map<string, number>()

  for (let y = 0; y < layout.rows; y += 1) {
    const row: Array<string | null> = []
    const originRow: Array<'label' | 'color' | 'empty'> = []
    for (let x = 0; x < layout.cols; x += 1) {
      const labelCode = labels[y][x]
      const labeled = labelCode ? FindMardColorByCode(labelCode) : null
      if (labeled) {
        row.push(labeled.hex)
        originRow.push('label')
        labeledCount += 1
        codeCounter.set(labeled.code, (codeCounter.get(labeled.code) || 0) + 1)
        continue
      }

      const left = layout.paddingX + x * layout.cellSize
      const top = layout.paddingY + y * layout.cellSize
      const sampled = SampleCellCornerColor(
        imageData.data,
        canvas.width,
        left,
        top,
        layout.cellSize,
      )
      const matched = MatchColorBySample(sampled)
      if (!matched) {
        row.push(null)
        originRow.push('empty')
        emptyCount += 1
        continue
      }
      row.push(matched.hex)
      originRow.push('color')
      sampledCount += 1
      codeCounter.set(matched.code, (codeCounter.get(matched.code) || 0) + 1)
    }
    cells.push(row)
    origins.push(originRow)
  }

  // 若存在明显背景色（如 T1 铺满），从网格中剔除以便用量统计
  let backgroundCode = ''
  let backgroundCount = 0
  for (const [code, count] of codeCounter.entries()) {
    if (count > backgroundCount) {
      backgroundCount = count
      backgroundCode = code
    }
  }
  const totalCells = layout.cols * layout.rows
  const backgroundColor = backgroundCode
    ? FindMardColorByCode(backgroundCode)
    : null
  if (
    backgroundColor &&
    IsLikelyBackground(backgroundColor) &&
    backgroundCount / totalCells >= 0.28
  ) {
    const bgHex = NormalizeHex(backgroundColor.hex)
    for (let y = 0; y < layout.rows; y += 1) {
      for (let x = 0; x < layout.cols; x += 1) {
        const hex = cells[y][x]
        if (!hex || NormalizeHex(hex) !== bgHex) {
          continue
        }
        if (origins[y][x] === 'label') {
          labeledCount -= 1
        } else if (origins[y][x] === 'color') {
          sampledCount -= 1
        }
        cells[y][x] = null
        origins[y][x] = 'empty'
        emptyCount += 1
      }
    }
  }

  const source: BlueprintDecodeResult['source'] =
    labeledCount > 0 && sampledCount > 0
      ? 'mixed'
      : labeledCount > 0
        ? 'label'
        : 'color'

  return {
    grid: {
      width: layout.cols,
      height: layout.rows,
      cells,
    },
    labeledCount,
    sampledCount,
    emptyCount,
    source,
  }
}
