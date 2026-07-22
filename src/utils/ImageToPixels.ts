/**
 * 图片转拼豆像素工具模块
 * 将上传图片缩小采样，并匹配到最近的 MARD 色号
 * 支持清晰度：相近色合并 + 锐化
 */

import { MARDCOLORS, type MardColor } from './MardColors'
import type { ColoredPixelGrid } from './TextToPixels'

/** 图片转像素配置 */
export type ImageToPixelOptions = {
  /** 图片 dataURL 或可绘制来源 */
  source: CanvasImageSource
  /** 最大横向豆数 */
  maxWidth: number
  /** 最大纵向豆数 */
  maxHeight: number
  /** Alpha 低于该值视为空位（0~255） */
  alphaThreshold: number
  /**
   * 清晰度 1~10
   * 越高：细节越多、锐化越强；越低：相近色合并越多，色块更统一
   */
  clarity: number
  /** 参与匹配的色卡，默认全部 MARD */
  palette?: MardColor[]
}

type RgbColor = {
  code: string
  hex: string
  r: number
  g: number
  b: number
}

/**
 * 将 HEX 解析为 RGB
 * @param hex 颜色值
 * @returns RGB 分量
 */
function ParseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim()
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  }
}

/**
 * 预计算色卡 RGB，加速最近色匹配
 * @param palette MARD 色卡
 * @returns RGB 色卡列表
 */
function BuildRgbCache(palette: MardColor[]): RgbColor[] {
  return palette.map((item) => {
    const rgb = ParseHexToRgb(item.hex)
    return {
      code: item.code,
      hex: item.hex.toUpperCase(),
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
    }
  })
}

/**
 * 计算两个 RGB 的加权距离平方
 * @param left 颜色 A
 * @param right 颜色 B
 * @returns 距离平方
 */
function ColorDistanceSq(
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
): number {
  const dr = left.r - right.r
  const dg = left.g - right.g
  const db = left.b - right.b
  return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11
}

/**
 * 在色卡中查找最近颜色（加权欧氏距离）
 * @param r 红
 * @param g 绿
 * @param b 蓝
 * @param palette RGB 色卡
 * @returns 最近 HEX
 */
function FindNearestPaletteHex(
  r: number,
  g: number,
  b: number,
  palette: RgbColor[],
): string {
  let bestHex = palette[0]?.hex || '#000000'
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i < palette.length; i += 1) {
    const item = palette[i]
    const distance = ColorDistanceSq({ r, g, b }, item)
    if (distance < bestDistance) {
      bestDistance = distance
      bestHex = item.hex
    }
  }

  return bestHex
}

/**
 * 规范化清晰度到 1~10
 * @param clarity 原始清晰度
 * @returns 合法清晰度
 */
export function NormalizeClarity(clarity: number): number {
  return Math.min(10, Math.max(1, Math.round(clarity || 6)))
}

/**
 * 根据清晰度推导采样策略参数
 * @param clarity 清晰度 1~10
 * @returns 合并阈值、最大色数、锐化强度、是否平滑缩放
 */
export function ResolveClarityParams(clarity: number): {
  mergeThreshold: number
  maxColors: number
  sharpenAmount: number
  smoothScale: boolean
} {
  const level = NormalizeClarity(clarity)
  const t = (level - 1) / 9

  return {
    // 低清晰度：合并阈值大，相近色更容易统一
    mergeThreshold: Math.round(95 - t * 90),
    // 低清晰度：限制最终色数，色块更整
    maxColors: Math.round(10 + t * 140),
    // 高清晰度：锐化更强，边缘更利落
    sharpenAmount: Number((t * 0.85).toFixed(2)),
    // 低清晰度用最近邻缩放，色块更硬朗
    smoothScale: level >= 5,
  }
}

/**
 * 按最大宽高限制计算目标像素尺寸（保持比例）
 * @param sourceWidth 原图宽
 * @param sourceHeight 原图高
 * @param maxWidth 最大宽
 * @param maxHeight 最大高
 * @returns 目标宽高
 */
export function ResolveTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const safeMaxWidth = Math.max(8, Math.round(maxWidth))
  const safeMaxHeight = Math.max(8, Math.round(maxHeight))
  if (!sourceWidth || !sourceHeight) {
    return { width: 0, height: 0 }
  }

  const widthRatio = safeMaxWidth / sourceWidth
  const heightRatio = safeMaxHeight / sourceHeight
  const scale = Math.min(widthRatio, heightRatio)

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

/**
 * 从 dataURL 加载图片元素
 * @param dataUrl 图片 dataURL
 * @returns HTMLImageElement
 */
export function LoadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = dataUrl
  })
}

/**
 * 读取可绘制对象的原始宽高
 * @param source 图片来源
 * @returns 宽高
 */
function ResolveSourceSize(source: CanvasImageSource): {
  width: number
  height: number
} {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width || 0,
      height: source.naturalHeight || source.height || 0,
    }
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height }
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height }
  }
  return { width: 0, height: 0 }
}

/**
 * 对 ImageData 做简易锐化（原图 + amount * (原图 - 3x3模糊)）
 * @param imageData 像素数据
 * @param amount 锐化强度 0~1+
 */
function ApplyUnsharpMask(imageData: ImageData, amount: number): void {
  if (amount <= 0.01) {
    return
  }

  const { width, height, data } = imageData
  const source = new Uint8ClampedArray(data)
  const getIndex = (x: number, y: number) => (y * width + x) * 4

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sumR = 0
      let sumG = 0
      let sumB = 0
      let count = 0

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const sx = Math.min(width - 1, Math.max(0, x + dx))
          const sy = Math.min(height - 1, Math.max(0, y + dy))
          const index = getIndex(sx, sy)
          sumR += source[index]
          sumG += source[index + 1]
          sumB += source[index + 2]
          count += 1
        }
      }

      const center = getIndex(x, y)
      const blurR = sumR / count
      const blurG = sumG / count
      const blurB = sumB / count

      data[center] = Math.min(
        255,
        Math.max(0, Math.round(source[center] + amount * (source[center] - blurR))),
      )
      data[center + 1] = Math.min(
        255,
        Math.max(
          0,
          Math.round(source[center + 1] + amount * (source[center + 1] - blurG)),
        ),
      )
      data[center + 2] = Math.min(
        255,
        Math.max(
          0,
          Math.round(source[center + 2] + amount * (source[center + 2] - blurB)),
        ),
      )
    }
  }
}

/**
 * 将相近色合并，并限制最大色数，使色块更统一
 * @param grid 已匹配 MARD 的彩色网格
 * @param mergeThreshold 合并距离阈值（加权距离开方近似）
 * @param maxColors 最大保留色数
 * @returns 合并后的网格
 */
export function UnifySimilarColors(
  grid: ColoredPixelGrid,
  mergeThreshold: number,
  maxColors: number,
): ColoredPixelGrid {
  const usage = new Map<string, number>()
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const hex = grid.cells[y][x]
      if (!hex) {
        continue
      }
      const key = hex.toUpperCase()
      usage.set(key, (usage.get(key) || 0) + 1)
    }
  }

  const sorted = Array.from(usage.entries())
    .map(([hex, count]) => ({ hex, count, rgb: ParseHexToRgb(hex) }))
    .sort((left, right) => right.count - left.count)

  if (!sorted.length) {
    return grid
  }

  const thresholdSq = mergeThreshold * mergeThreshold
  const remap = new Map<string, string>()
  const kept: Array<{ hex: string; rgb: { r: number; g: number; b: number } }> =
    []

  // 按用量从高到低：相近色并入已保留主色
  sorted.forEach((item) => {
    let target = item.hex
    for (let i = 0; i < kept.length; i += 1) {
      if (ColorDistanceSq(item.rgb, kept[i].rgb) <= thresholdSq) {
        target = kept[i].hex
        break
      }
    }
    if (target === item.hex) {
      if (kept.length < Math.max(1, maxColors)) {
        kept.push({ hex: item.hex, rgb: item.rgb })
      } else {
        // 超出色数上限时，并入最近主色
        let best = kept[0].hex
        let bestDistance = Number.POSITIVE_INFINITY
        for (let i = 0; i < kept.length; i += 1) {
          const distance = ColorDistanceSq(item.rgb, kept[i].rgb)
          if (distance < bestDistance) {
            bestDistance = distance
            best = kept[i].hex
          }
        }
        target = best
      }
    }
    remap.set(item.hex, target)
  })

  const cells = grid.cells.map((row) =>
    row.map((hex) => {
      if (!hex) {
        return null
      }
      return remap.get(hex.toUpperCase()) || hex.toUpperCase()
    }),
  )

  return { width: grid.width, height: grid.height, cells }
}

/**
 * 将图片转换为匹配 MARD 色卡的彩色像素网格
 * @param options 采样与匹配配置
 * @returns 彩色像素网格
 */
export function ConvertImageToPixels(
  options: ImageToPixelOptions,
): ColoredPixelGrid {
  const size = ResolveSourceSize(options.source)
  const target = ResolveTargetSize(
    size.width,
    size.height,
    options.maxWidth,
    options.maxHeight,
  )

  if (!target.width || !target.height) {
    return { width: 0, height: 0, cells: [] }
  }

  const clarityParams = ResolveClarityParams(options.clarity)
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { width: 0, height: 0, cells: [] }
  }

  ctx.imageSmoothingEnabled = clarityParams.smoothScale
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, target.width, target.height)
  ctx.drawImage(options.source, 0, 0, target.width, target.height)

  const imageData = ctx.getImageData(0, 0, target.width, target.height)
  ApplyUnsharpMask(imageData, clarityParams.sharpenAmount)

  const palette = BuildRgbCache(options.palette || MARDCOLORS)
  const alphaThreshold = Math.max(0, Math.min(255, options.alphaThreshold))
  const cells: Array<Array<string | null>> = []

  for (let y = 0; y < target.height; y += 1) {
    const row: Array<string | null> = []
    for (let x = 0; x < target.width; x += 1) {
      const index = (y * target.width + x) * 4
      const red = imageData.data[index]
      const green = imageData.data[index + 1]
      const blue = imageData.data[index + 2]
      const alpha = imageData.data[index + 3]

      if (alpha < alphaThreshold) {
        row.push(null)
      } else {
        row.push(FindNearestPaletteHex(red, green, blue, palette))
      }
    }
    cells.push(row)
  }

  const matchedGrid: ColoredPixelGrid = {
    width: target.width,
    height: target.height,
    cells,
  }

  return UnifySimilarColors(
    matchedGrid,
    clarityParams.mergeThreshold,
    clarityParams.maxColors,
  )
}

/**
 * 统计彩色网格中各色号用量
 * @param grid 彩色像素网格
 * @returns 色号用量列表（按数量降序）
 */
export function CountColorUsage(
  grid: ColoredPixelGrid,
): Array<{ hex: string; code: string; count: number }> {
  const counter = new Map<string, number>()

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const hex = grid.cells[y][x]
      if (!hex) {
        continue
      }
      const key = hex.toUpperCase()
      counter.set(key, (counter.get(key) || 0) + 1)
    }
  }

  return Array.from(counter.entries())
    .map(([hex, count]) => {
      const matched = MARDCOLORS.find(
        (item) => item.hex.toUpperCase() === hex,
      )
      return {
        hex,
        code: matched ? matched.code : hex.replace('#', ''),
        count,
      }
    })
    .sort((left, right) => right.count - left.count)
}
