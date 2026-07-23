/**
 * 长图拼接 / 图片分割工具模块
 * 多图竖向拼接；单图按行列均等切分并导出
 */

import JSZip from 'jszip'

/** 已加载的图片项 */
export type LoadedImageItem = {
  uid: string
  name: string
  width: number
  height: number
  image: HTMLImageElement
  previewUrl: string
}

/** 水平对齐方式 */
export type StitchAlign = 'left' | 'center' | 'right'

/** 竖向拼接单层参数 */
export type StitchLayer = {
  image: HTMLImageElement
  /** 缩放百分比 10~200，100 为原尺寸 */
  scale: number
  /** 水平对齐 */
  align: StitchAlign
}

/** 分割结果单项 */
export type SplitPiece = {
  blob: Blob
  fileName: string
  width: number
  height: number
  row: number
  col: number
}

/**
 * 生成上传项唯一 ID
 * @returns uid
 */
export function CreateJoinUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 从 File 加载单张图片（blob URL 由调用方负责释放）
 * @param file 图片文件
 * @param uid 可选唯一 ID
 * @returns 已加载图片项
 */
export function LoadImageItemFromFile(
  file: File,
  uid = CreateJoinUid(),
): Promise<LoadedImageItem> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({
        uid,
        name: file.name,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        image,
        previewUrl,
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl)
      reject(new Error(`图片加载失败：${file.name}`))
    }
    image.src = previewUrl
  })
}

/**
 * 批量从 File 列表加载图片
 * @param files 文件列表
 * @returns 已加载图片项数组
 */
export async function LoadImagesFromFiles(
  files: File[],
): Promise<LoadedImageItem[]> {
  const items: LoadedImageItem[] = []
  for (const file of files) {
    items.push(await LoadImageItemFromFile(file))
  }
  return items
}

/**
 * 释放图片项预览 URL
 * @param item 图片项
 */
export function RevokeImageItem(item: LoadedImageItem) {
  if (item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl)
  }
}

/**
 * Canvas 导出为 PNG Blob
 * @param canvas 画布
 * @returns PNG Blob
 */
function CanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('导出 PNG 失败'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

/**
 * 按缩放百分比计算绘制尺寸
 * @param naturalWidth 原宽
 * @param naturalHeight 原高
 * @param scalePercent 缩放百分比
 * @returns 绘制宽高
 */
export function GetScaledDrawSize(
  naturalWidth: number,
  naturalHeight: number,
  scalePercent: number,
): { width: number; height: number } {
  const ratio = Math.min(200, Math.max(10, scalePercent)) / 100
  return {
    width: Math.max(1, Math.round(naturalWidth * ratio)),
    height: Math.max(1, Math.round(naturalHeight * ratio)),
  }
}

/**
 * 根据对齐方式计算绘制 X（单列时相对画布）
 * @param canvasWidth 画布宽
 * @param drawWidth 绘制宽
 * @param align 对齐
 * @returns x 坐标
 */
export function GetAlignedDrawX(
  canvasWidth: number,
  drawWidth: number,
  align: StitchAlign,
): number {
  if (align === 'left') {
    return 0
  }
  if (align === 'right') {
    return Math.max(0, canvasWidth - drawWidth)
  }
  return Math.round((canvasWidth - drawWidth) / 2)
}

/**
 * 根据对齐方式计算行内垂直偏移（多列时：left=上 center=中 right=下）
 * @param rowHeight 行高
 * @param drawHeight 绘制高
 * @param align 对齐
 * @returns y 偏移
 */
export function GetAlignedDrawY(
  rowHeight: number,
  drawHeight: number,
  align: StitchAlign,
): number {
  if (align === 'left') {
    return 0
  }
  if (align === 'right') {
    return Math.max(0, rowHeight - drawHeight)
  }
  return Math.round((rowHeight - drawHeight) / 2)
}

/**
 * 将列表按每行张数分块
 * @param items 列表
 * @param columns 每行张数
 * @returns 二维行数组
 */
export function ChunkByColumns<T>(items: T[], columns: number): T[][] {
  const cols = Math.min(6, Math.max(1, Math.round(columns)))
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols))
  }
  return rows
}

/**
 * 估算拼接画布尺寸
 * @param layers 图层
 * @param gap 间距
 * @param columns 每行张数
 * @returns 宽高
 */
export function GetStitchCanvasSize(
  layers: StitchLayer[],
  gap = 0,
  columns = 1,
): { width: number; height: number } {
  if (!layers.length) {
    return { width: 0, height: 0 }
  }
  const safeGap = Math.max(0, Math.round(gap))
  const cols = Math.min(6, Math.max(1, Math.round(columns)))
  const drawSizes = layers.map((layer) => {
    const nw = layer.image.naturalWidth || layer.image.width
    const nh = layer.image.naturalHeight || layer.image.height
    return GetScaledDrawSize(nw, nh, layer.scale)
  })
  const rowChunks = ChunkByColumns(
    drawSizes.map((size, index) => ({ size, layer: layers[index] })),
    cols,
  )

  let canvasW = 0
  let canvasH = 0
  rowChunks.forEach((row, rowIndex) => {
    const rowW =
      row.reduce((sum, cell) => sum + cell.size.width, 0) +
      safeGap * Math.max(0, row.length - 1)
    const rowH = Math.max(...row.map((cell) => cell.size.height))
    canvasW = Math.max(canvasW, rowW)
    canvasH += rowH + (rowIndex < rowChunks.length - 1 ? safeGap : 0)
  })

  return { width: canvasW, height: canvasH }
}

/**
 * 多图拼接成长图（支持每行多张、缩放与对齐）
 * @param layers 图层列表（阅读顺序：从左到右、从上到下）
 * @param gap 图片间距（像素）
 * @param columns 每行张数，1 为单列竖排
 * @param rowAlign 多列时整行在画布中的水平对齐
 * @returns PNG Blob
 */
export async function StitchImagesVertical(
  layers: StitchLayer[],
  gap = 0,
  columns = 1,
  rowAlign: StitchAlign = 'center',
): Promise<Blob> {
  if (!layers.length) {
    throw new Error('请至少上传一张图片')
  }

  const safeGap = Math.max(0, Math.round(gap))
  const cols = Math.min(6, Math.max(1, Math.round(columns)))
  const { width: canvasW, height: canvasH } = GetStitchCanvasSize(
    layers,
    safeGap,
    cols,
  )

  if (!canvasW || !canvasH) {
    throw new Error('图片尺寸无效')
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布')
  }

  ctx.clearRect(0, 0, canvasW, canvasH)

  const drawSizes = layers.map((layer) => {
    const nw = layer.image.naturalWidth || layer.image.width
    const nh = layer.image.naturalHeight || layer.image.height
    return GetScaledDrawSize(nw, nh, layer.scale)
  })
  const rowChunks = ChunkByColumns(
    layers.map((layer, index) => ({
      layer,
      size: drawSizes[index],
    })),
    cols,
  )

  let cursorY = 0
  rowChunks.forEach((row, rowIndex) => {
    const rowH = Math.max(...row.map((cell) => cell.size.height))
    const contentW =
      row.reduce((sum, cell) => sum + cell.size.width, 0) +
      safeGap * Math.max(0, row.length - 1)

    let cursorX =
      cols === 1
        ? GetAlignedDrawX(canvasW, row[0].size.width, row[0].layer.align)
        : GetAlignedDrawX(canvasW, contentW, rowAlign)

    row.forEach((cell) => {
      const { width: w, height: h } = cell.size
      const drawY =
        cols === 1
          ? cursorY
          : cursorY + GetAlignedDrawY(rowH, h, cell.layer.align)
      ctx.drawImage(cell.layer.image, cursorX, drawY, w, h)
      if (cols > 1) {
        cursorX += w + safeGap
      }
    })

    cursorY += rowH + (rowIndex < rowChunks.length - 1 ? safeGap : 0)
  })

  return CanvasToPngBlob(canvas)
}

/** 自由布局图层 */
export type FreeStitchLayer = {
  image: HTMLImageElement
  scale: number
  x: number
  y: number
}

/**
 * 按自动网格计算各图左上角坐标
 * @param sizes 缩放后尺寸列表
 * @param columns 每行张数
 * @param gap 间距
 * @param rowAlign 多列整行对齐（相对最宽行）
 * @returns 坐标列表
 */
export function ComputeGridPositions(
  sizes: Array<{ width: number; height: number }>,
  columns = 1,
  gap = 0,
  rowAlign: StitchAlign = 'center',
): Array<{ x: number; y: number }> {
  if (!sizes.length) {
    return []
  }
  const safeGap = Math.max(0, Math.round(gap))
  const cols = Math.min(6, Math.max(1, Math.round(columns)))
  const rows = ChunkByColumns(
    sizes.map((size, index) => ({ size, index })),
    cols,
  )
  const rowWidths = rows.map(
    (row) =>
      row.reduce((sum, cell) => sum + cell.size.width, 0) +
      safeGap * Math.max(0, row.length - 1),
  )
  const canvasW = Math.max(...rowWidths)
  const positions: Array<{ x: number; y: number }> = sizes.map(() => ({
    x: 0,
    y: 0,
  }))

  let cursorY = 0
  rows.forEach((row, rowIndex) => {
    const rowH = Math.max(...row.map((cell) => cell.size.height))
    const contentW = rowWidths[rowIndex]
    let cursorX = GetAlignedDrawX(canvasW, contentW, rowAlign)
    row.forEach((cell) => {
      positions[cell.index] = { x: cursorX, y: cursorY }
      cursorX += cell.size.width + safeGap
    })
    cursorY += rowH + (rowIndex < rows.length - 1 ? safeGap : 0)
  })

  return positions
}

/**
 * 自由布局包围盒（含所有图层）
 * @param layers 自由图层
 * @returns 最小点与宽高
 */
export function GetFreeStitchBounds(layers: FreeStitchLayer[]): {
  minX: number
  minY: number
  width: number
  height: number
} {
  if (!layers.length) {
    return { minX: 0, minY: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  layers.forEach((layer) => {
    const nw = layer.image.naturalWidth || layer.image.width
    const nh = layer.image.naturalHeight || layer.image.height
    const { width, height } = GetScaledDrawSize(nw, nh, layer.scale)
    minX = Math.min(minX, layer.x)
    minY = Math.min(minY, layer.y)
    maxX = Math.max(maxX, layer.x + width)
    maxY = Math.max(maxY, layer.y + height)
  })
  return {
    minX,
    minY,
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY)),
  }
}

/**
 * 按自由坐标拼接导出 PNG（裁到内容包围盒）
 * @param layers 自由图层（后绘在上层）
 * @returns PNG Blob
 */
export async function StitchImagesFree(
  layers: FreeStitchLayer[],
): Promise<Blob> {
  if (!layers.length) {
    throw new Error('请至少上传一张图片')
  }
  const { minX, minY, width, height } = GetFreeStitchBounds(layers)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布')
  }
  ctx.clearRect(0, 0, width, height)
  layers.forEach((layer) => {
    const nw = layer.image.naturalWidth || layer.image.width
    const nh = layer.image.naturalHeight || layer.image.height
    const { width: w, height: h } = GetScaledDrawSize(nw, nh, layer.scale)
    ctx.drawImage(layer.image, layer.x - minX, layer.y - minY, w, h)
  })
  return CanvasToPngBlob(canvas)
}

/**
 * 计算网格各格像素范围（余数并入末行/末列）
 * @param total 总长度
 * @param count 份数
 * @returns 每格的 start 与 size
 */
export function BuildGridSlices(
  total: number,
  count: number,
): Array<{ start: number; size: number }> {
  const n = Math.max(1, Math.floor(count))
  const base = Math.floor(total / n)
  const remainder = total - base * n
  const slices: Array<{ start: number; size: number }> = []
  let start = 0
  for (let i = 0; i < n; i += 1) {
    const size = base + (i === n - 1 ? remainder : 0)
    slices.push({ start, size: Math.max(1, size) })
    start += size
  }
  return slices
}

/**
 * 计算分割预览单元格（与导出切分一致）
 * @param width 原图宽
 * @param height 原图高
 * @param rows 行数
 * @param cols 列数
 * @returns 行优先单元格列表
 */
export function GetSplitPreviewCells(
  width: number,
  height: number,
  rows: number,
  cols: number,
): Array<{
  key: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}> {
  const safeRows = Math.min(20, Math.max(1, Math.round(rows)))
  const safeCols = Math.min(20, Math.max(1, Math.round(cols)))
  const rowSlices = BuildGridSlices(height, safeRows)
  const colSlices = BuildGridSlices(width, safeCols)
  const cells: Array<{
    key: string
    row: number
    col: number
    x: number
    y: number
    width: number
    height: number
  }> = []

  for (let r = 0; r < rowSlices.length; r += 1) {
    for (let c = 0; c < colSlices.length; c += 1) {
      cells.push({
        key: `r${r + 1}c${c + 1}`,
        row: r + 1,
        col: c + 1,
        x: colSlices[c].start,
        y: rowSlices[r].start,
        width: colSlices[c].size,
        height: rowSlices[r].size,
      })
    }
  }
  return cells
}

/**
 * 由自定义切线生成切片区间（切线为像素位置，不含 0 与 total）
 * @param total 总长度
 * @param cuts 切线坐标
 * @returns 区间列表
 */
export function BuildSlicesFromCuts(
  total: number,
  cuts: number[],
): Array<{ start: number; size: number }> {
  if (total <= 0) {
    return []
  }
  const points = [
    0,
    ...cuts
      .map((cut) => Math.round(cut))
      .filter((cut) => cut > 0 && cut < total),
    total,
  ]
  const unique = Array.from(new Set(points)).sort((a, b) => a - b)
  const slices: Array<{ start: number; size: number }> = []
  for (let i = 0; i < unique.length - 1; i += 1) {
    const start = unique[i]
    const end = unique[i + 1]
    const size = end - start
    if (size > 0) {
      slices.push({ start, size })
    }
  }
  if (!slices.length) {
    return [{ start: 0, size: total }]
  }
  return slices
}

/**
 * 按自定义横竖切线计算预览单元格
 * @param width 原图宽
 * @param height 原图高
 * @param verticalCuts 竖切线 x 坐标
 * @param horizontalCuts 横切线 y 坐标
 * @returns 行优先单元格
 */
export function GetSplitPreviewCellsFromCuts(
  width: number,
  height: number,
  verticalCuts: number[],
  horizontalCuts: number[],
): Array<{
  key: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}> {
  const rowSlices = BuildSlicesFromCuts(height, horizontalCuts)
  const colSlices = BuildSlicesFromCuts(width, verticalCuts)
  const cells: Array<{
    key: string
    row: number
    col: number
    x: number
    y: number
    width: number
    height: number
  }> = []

  for (let r = 0; r < rowSlices.length; r += 1) {
    for (let c = 0; c < colSlices.length; c += 1) {
      cells.push({
        key: `r${r + 1}c${c + 1}`,
        row: r + 1,
        col: c + 1,
        x: colSlices[c].start,
        y: rowSlices[r].start,
        width: colSlices[c].size,
        height: rowSlices[r].size,
      })
    }
  }
  return cells
}

/**
 * 按自定义切线分割图片
 * @param image 源图
 * @param verticalCuts 竖切线
 * @param horizontalCuts 横切线
 * @param baseName 文件名前缀
 * @returns 分割结果
 */
export async function SplitImageByCuts(
  image: HTMLImageElement,
  verticalCuts: number[],
  horizontalCuts: number[],
  baseName = 'split',
): Promise<SplitPiece[]> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('图片尺寸无效')
  }

  const cells = GetSplitPreviewCellsFromCuts(
    width,
    height,
    verticalCuts,
    horizontalCuts,
  )
  const prefix = baseName.replace(/\.[^.]+$/, '') || 'split'
  const pieces: SplitPiece[] = []

  for (const cell of cells) {
    const canvas = document.createElement('canvas')
    canvas.width = cell.width
    canvas.height = cell.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建画布')
    }
    ctx.clearRect(0, 0, cell.width, cell.height)
    ctx.drawImage(
      image,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      0,
      0,
      cell.width,
      cell.height,
    )
    const blob = await CanvasToPngBlob(canvas)
    pieces.push({
      blob,
      fileName: `${prefix}_r${cell.row}_c${cell.col}.png`,
      width: cell.width,
      height: cell.height,
      row: cell.row,
      col: cell.col,
    })
  }

  return pieces
}

/** 自由分割线段：可指定起止长度，不必贯穿整图 */
export type FreeCutSegment = {
  uid: string
  axis: 'vertical' | 'horizontal'
  /** 竖线为 x，横线为 y */
  pos: number
  /** 竖线为 y 起点，横线为 x 起点 */
  start: number
  /** 竖线为 y 终点，横线为 x 终点 */
  end: number
}

/** 分割矩形区域 */
export type SplitRect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 用一条竖线段切割矩形列表
 * @param rects 当前矩形
 * @param x 竖线 x
 * @param yStart 竖线起点 y
 * @param yEnd 竖线终点 y
 * @returns 切割后矩形
 */
function SplitRectsByVerticalSegment(
  rects: SplitRect[],
  x: number,
  yStart: number,
  yEnd: number,
): SplitRect[] {
  const next: SplitRect[] = []
  for (const rect of rects) {
    const rawStart = Math.max(rect.y, yStart)
    const rawEnd = Math.min(rect.y + rect.height, yEnd)
    const { start: overlapStart, end: overlapEnd } = AbsorbMicroOverlap(
      rect.y,
      rect.y + rect.height,
      rawStart,
      rawEnd,
    )
    const canSplit =
      x > rect.x &&
      x < rect.x + rect.width &&
      overlapEnd - overlapStart >= 1

    if (!canSplit) {
      next.push(rect)
      continue
    }

    if (overlapStart > rect.y) {
      next.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: overlapStart - rect.y,
      })
    }
    next.push({
      x: rect.x,
      y: overlapStart,
      width: x - rect.x,
      height: overlapEnd - overlapStart,
    })
    next.push({
      x: x,
      y: overlapStart,
      width: rect.x + rect.width - x,
      height: overlapEnd - overlapStart,
    })
    if (overlapEnd < rect.y + rect.height) {
      next.push({
        x: rect.x,
        y: overlapEnd,
        width: rect.width,
        height: rect.y + rect.height - overlapEnd,
      })
    }
  }
  return next.filter((item) => item.width >= 1 && item.height >= 1)
}

/**
 * 用一条横线段切割矩形列表
 * @param rects 当前矩形
 * @param y 横线 y
 * @param xStart 横线起点 x
 * @param xEnd 横线终点 x
 * @returns 切割后矩形
 */
function SplitRectsByHorizontalSegment(
  rects: SplitRect[],
  y: number,
  xStart: number,
  xEnd: number,
): SplitRect[] {
  const next: SplitRect[] = []
  for (const rect of rects) {
    const rawStart = Math.max(rect.x, xStart)
    const rawEnd = Math.min(rect.x + rect.width, xEnd)
    const { start: overlapStart, end: overlapEnd } = AbsorbMicroOverlap(
      rect.x,
      rect.x + rect.width,
      rawStart,
      rawEnd,
    )
    const canSplit =
      y > rect.y &&
      y < rect.y + rect.height &&
      overlapEnd - overlapStart >= 1

    if (!canSplit) {
      next.push(rect)
      continue
    }

    if (overlapStart > rect.x) {
      next.push({
        x: rect.x,
        y: rect.y,
        width: overlapStart - rect.x,
        height: rect.height,
      })
    }
    next.push({
      x: overlapStart,
      y: rect.y,
      width: overlapEnd - overlapStart,
      height: y - rect.y,
    })
    next.push({
      x: overlapStart,
      y: y,
      width: overlapEnd - overlapStart,
      height: rect.y + rect.height - y,
    })
    if (overlapEnd < rect.x + rect.width) {
      next.push({
        x: overlapEnd,
        y: rect.y,
        width: rect.x + rect.width - overlapEnd,
        height: rect.height,
      })
    }
  }
  return next.filter((item) => item.width >= 1 && item.height >= 1)
}

/**
 * 规范化线段起止，保证 start < end
 * @param cut 原始线段
 * @returns 规范化线段
 */
function NormalizeCutSegment(cut: FreeCutSegment): FreeCutSegment {
  const start = Math.min(cut.start, cut.end)
  const end = Math.max(cut.start, cut.end)
  return { ...cut, start, end }
}

/**
 * 将数值吸附到最近参考线
 * @param value 原始值
 * @param guides 参考线坐标
 * @param threshold 吸附阈值（像素）
 * @returns 吸附后的值
 */
function SnapToGuides(
  value: number,
  guides: number[],
  threshold: number,
): number {
  let best = value
  let bestDist = threshold
  for (const guide of guides) {
    const dist = Math.abs(guide - value)
    if (dist <= bestDist) {
      bestDist = dist
      best = guide
    }
  }
  return best
}

/**
 * 对齐自由切线：端点吸附到交叉切线，避免差几像素产生细条碎块
 * @param width 原图宽
 * @param height 原图高
 * @param cuts 原始线段
 * @param threshold 吸附阈值
 * @returns 对齐后的线段
 */
export function AlignFreeCutSegments(
  width: number,
  height: number,
  cuts: FreeCutSegment[],
  threshold = 8,
): FreeCutSegment[] {
  if (!cuts.length) {
    return []
  }
  const normalized = cuts.map(NormalizeCutSegment)
  const verticalPosGuides = [
    0,
    width,
    ...normalized.filter((cut) => cut.axis === 'vertical').map((cut) => cut.pos),
  ]
  const horizontalPosGuides = [
    0,
    height,
    ...normalized
      .filter((cut) => cut.axis === 'horizontal')
      .map((cut) => cut.pos),
  ]

  return normalized.map((cut) => {
    if (cut.axis === 'vertical') {
      const pos = Math.round(
        Math.min(
          width - 1,
          Math.max(1, SnapToGuides(cut.pos, verticalPosGuides, threshold)),
        ),
      )
      const start = Math.round(
        Math.min(
          height,
          Math.max(0, SnapToGuides(cut.start, horizontalPosGuides, threshold)),
        ),
      )
      const end = Math.round(
        Math.min(
          height,
          Math.max(0, SnapToGuides(cut.end, horizontalPosGuides, threshold)),
        ),
      )
      return NormalizeCutSegment({ ...cut, pos, start, end })
    }
    const pos = Math.round(
      Math.min(
        height - 1,
        Math.max(1, SnapToGuides(cut.pos, horizontalPosGuides, threshold)),
      ),
    )
    const start = Math.round(
      Math.min(
        width,
        Math.max(0, SnapToGuides(cut.start, verticalPosGuides, threshold)),
      ),
    )
    const end = Math.round(
      Math.min(
        width,
        Math.max(0, SnapToGuides(cut.end, verticalPosGuides, threshold)),
      ),
    )
    return NormalizeCutSegment({ ...cut, pos, start, end })
  })
}

/**
 * 切割时吞掉过小残留边，避免 1px 细条
 * @param edgeStart 矩形边起点
 * @param edgeEnd 矩形边终点
 * @param overlapStart 重叠起点
 * @param overlapEnd 重叠终点
 * @param minSize 最小保留尺寸
 * @returns 调整后的重叠区间
 */
function AbsorbMicroOverlap(
  edgeStart: number,
  edgeEnd: number,
  overlapStart: number,
  overlapEnd: number,
  minSize = 2,
): { start: number; end: number } {
  let start = overlapStart
  let end = overlapEnd
  if (start > edgeStart && start - edgeStart < minSize) {
    start = edgeStart
  }
  if (end < edgeEnd && edgeEnd - end < minSize) {
    end = edgeEnd
  }
  return { start, end }
}

/**
 * 按可调长度线段分割为矩形区域
 * @param width 原图宽
 * @param height 原图高
 * @param cuts 线段列表
 * @returns 区域列表
 */
export function PartitionRectsBySegments(
  width: number,
  height: number,
  cuts: FreeCutSegment[],
): SplitRect[] {
  let rects: SplitRect[] = [{ x: 0, y: 0, width, height }]
  const sorted = AlignFreeCutSegments(width, height, cuts)
    .filter((cut) => cut.end - cut.start >= 1)
    .sort((a, b) => a.pos - b.pos || a.start - b.start)

  for (const cut of sorted) {
    if (cut.axis === 'vertical') {
      const x = Math.round(Math.min(Math.max(cut.pos, 1), width - 1))
      const yStart = Math.round(Math.min(Math.max(cut.start, 0), height))
      const yEnd = Math.round(Math.min(Math.max(cut.end, 0), height))
      if (yEnd - yStart < 1) continue
      rects = SplitRectsByVerticalSegment(rects, x, yStart, yEnd)
    } else {
      const y = Math.round(Math.min(Math.max(cut.pos, 1), height - 1))
      const xStart = Math.round(Math.min(Math.max(cut.start, 0), width))
      const xEnd = Math.round(Math.min(Math.max(cut.end, 0), width))
      if (xEnd - xStart < 1) continue
      rects = SplitRectsByHorizontalSegment(rects, y, xStart, xEnd)
    }
  }
  return rects
}

/**
 * 为矩形分配大致行列号并生成单元格
 * @param rects 矩形列表
 * @returns 预览单元格
 */
function MapRectsToCells(
  rects: SplitRect[],
): Array<{
  key: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}> {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const yKeys = Array.from(new Set(sorted.map((item) => item.y))).sort(
    (a, b) => a - b,
  )
  const xKeys = Array.from(new Set(sorted.map((item) => item.x))).sort(
    (a, b) => a - b,
  )
  const FindNearestIndex = (keys: number[], value: number): number => {
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < keys.length; i += 1) {
      const dist = Math.abs(keys[i] - value)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    return best
  }

  return sorted.map((rect, index) => {
    const row = FindNearestIndex(yKeys, rect.y) + 1
    const col = FindNearestIndex(xKeys, rect.x) + 1
    return {
      key: `p${index + 1}_r${row}c${col}`,
      row,
      col,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  })
}

/**
 * 按可调长度线段计算预览单元格
 * @param width 原图宽
 * @param height 原图高
 * @param cuts 线段列表
 * @returns 单元格列表
 */
export function GetSplitPreviewCellsFromSegments(
  width: number,
  height: number,
  cuts: FreeCutSegment[],
): Array<{
  key: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}> {
  if (!cuts.length) {
    return [
      {
        key: 'r1c1',
        row: 1,
        col: 1,
        x: 0,
        y: 0,
        width,
        height,
      },
    ]
  }
  return MapRectsToCells(PartitionRectsBySegments(width, height, cuts))
}

/**
 * 按可调长度线段分割图片
 * @param image 源图
 * @param cuts 线段列表
 * @param baseName 文件名前缀
 * @returns 分割结果
 */
export async function SplitImageBySegments(
  image: HTMLImageElement,
  cuts: FreeCutSegment[],
  baseName = 'split',
): Promise<SplitPiece[]> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('图片尺寸无效')
  }

  const cells = GetSplitPreviewCellsFromSegments(width, height, cuts)
  const prefix = baseName.replace(/\.[^.]+$/, '') || 'split'
  const pieces: SplitPiece[] = []

  for (const cell of cells) {
    const canvas = document.createElement('canvas')
    canvas.width = cell.width
    canvas.height = cell.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建画布')
    }
    ctx.clearRect(0, 0, cell.width, cell.height)
    ctx.drawImage(
      image,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      0,
      0,
      cell.width,
      cell.height,
    )
    const blob = await CanvasToPngBlob(canvas)
    pieces.push({
      blob,
      fileName: `${prefix}_${cell.key}.png`,
      width: cell.width,
      height: cell.height,
      row: cell.row,
      col: cell.col,
    })
  }

  return pieces
}

/**
 * 单图按行列均等分割
 * @param image 源图
 * @param rows 行数 1~20
 * @param cols 列数 1~20
 * @param baseName 输出文件名前缀
 * @returns 分割结果列表（行优先）
 */
export async function SplitImageGrid(
  image: HTMLImageElement,
  rows: number,
  cols: number,
  baseName = 'split',
): Promise<SplitPiece[]> {
  const safeRows = Math.min(20, Math.max(1, Math.round(rows)))
  const safeCols = Math.min(20, Math.max(1, Math.round(cols)))
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  if (!width || !height) {
    throw new Error('图片尺寸无效')
  }

  const rowSlices = BuildGridSlices(height, safeRows)
  const colSlices = BuildGridSlices(width, safeCols)
  const pieces: SplitPiece[] = []
  const prefix = baseName.replace(/\.[^.]+$/, '') || 'split'

  for (let r = 0; r < rowSlices.length; r += 1) {
    for (let c = 0; c < colSlices.length; c += 1) {
      const { start: sx, size: sw } = colSlices[c]
      const { start: sy, size: sh } = rowSlices[r]
      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建画布')
      }
      ctx.clearRect(0, 0, sw, sh)
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
      const blob = await CanvasToPngBlob(canvas)
      pieces.push({
        blob,
        fileName: `${prefix}_r${r + 1}_c${c + 1}.png`,
        width: sw,
        height: sh,
        row: r + 1,
        col: c + 1,
      })
    }
  }

  return pieces
}

/**
 * 触发浏览器下载 Blob
 * @param blob 数据
 * @param fileName 文件名
 */
export function DownloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 将多个分割结果打包为 ZIP
 * @param pieces 分割结果
 * @param zipName ZIP 文件名
 * @returns ZIP Blob
 */
export async function ZipSplitPieces(
  pieces: SplitPiece[],
  zipName = 'split_images.zip',
): Promise<{ blob: Blob; fileName: string }> {
  const zip = new JSZip()
  pieces.forEach((piece) => {
    zip.file(piece.fileName, piece.blob)
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, fileName: zipName }
}
