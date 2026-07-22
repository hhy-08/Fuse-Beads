/**
 * 图片转拼豆像素工具模块
 * 将上传图片缩小采样，并匹配到最近的 MARD 色号
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
    const dr = r - item.r
    const dg = g - item.g
    const db = b - item.b
    // 人眼对绿色更敏感，略作加权
    const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11
    if (distance < bestDistance) {
      bestDistance = distance
      bestHex = item.hex
    }
  }

  return bestHex
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

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { width: 0, height: 0, cells: [] }
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, target.width, target.height)
  ctx.drawImage(options.source, 0, 0, target.width, target.height)

  const imageData = ctx.getImageData(0, 0, target.width, target.height)
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

  return { width: target.width, height: target.height, cells }
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
