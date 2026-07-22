/**
 * 拼豆图案 Canvas 绘制与导出工具模块
 * 以像素方格图纸样式绘制（对齐常见拼豆图纸：方格、网格、色号）
 */

import { FindMardColorByHex } from './MardColors'
import type { BeadPatternGrid } from './TextToPixels'

/** 绘制配置 */
export type DrawBeadOptions = {
  beadSize: number
  backgroundColor: string
  showGrid: boolean
  showColorCode: boolean
}

/**
 * 根据带描边层的像素网格在目标 Canvas 上绘制方格拼豆图纸
 * @param canvas 目标画布
 * @param pattern 主体 + 外轮廓描边豆网格（每格自带颜色）
 * @param options 格子尺寸与网格配置
 */
export function DrawBeadPattern(
  canvas: HTMLCanvasElement,
  pattern: BeadPatternGrid,
  options: DrawBeadOptions,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const cellSize = Math.max(8, Math.round(options.beadSize))
  const padding = Math.max(16, Math.round(cellSize * 0.8))

  if (!pattern.width || !pattern.height) {
    canvas.width = 320
    canvas.height = 200
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#8a8f98'
    ctx.font = '16px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('请输入文字生成拼豆图案', canvas.width / 2, canvas.height / 2)
    return
  }

  canvas.width = pattern.width * cellSize + padding * 2
  canvas.height = pattern.height * cellSize + padding * 2

  ctx.fillStyle = options.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const canShowCode = options.showColorCode && cellSize >= 16

  for (let y = 0; y < pattern.height; y += 1) {
    for (let x = 0; x < pattern.width; x += 1) {
      const cell = pattern.cells[y][x]
      const left = padding + x * cellSize
      const top = padding + y * cellSize
      const fillColor =
        cell.kind === 'empty' ? options.backgroundColor : cell.color
      const colorCode =
        cell.kind === 'empty' ? '' : ResolveColorCode(cell.color)

      ctx.fillStyle = fillColor
      ctx.fillRect(left, top, cellSize, cellSize)

      if (canShowCode && colorCode) {
        DrawCellLabel(ctx, left, top, cellSize, colorCode, fillColor)
      }
    }
  }

  if (options.showGrid) {
    DrawPixelGrid(ctx, pattern, cellSize, padding)
  }
}

/**
 * 解析 HEX 对应的 MARD 色号，找不到则返回空串
 * @param hex 颜色值
 * @returns 色号文案
 */
function ResolveColorCode(hex: string): string {
  const matched = FindMardColorByHex(hex)
  return matched ? matched.code : ''
}

/**
 * 判断颜色是否偏深，用于选择标签对比色
 * @param hex 颜色值
 * @returns 是否为深色
 */
function IsDarkColor(hex: string): boolean {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return false
  }
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance < 140
}

/**
 * 在方格中心绘制色号文字
 * @param ctx Canvas 上下文
 * @param left 格子左边界
 * @param top 格子上边界
 * @param cellSize 格子边长
 * @param code 色号
 * @param fillColor 格子底色
 */
function DrawCellLabel(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  cellSize: number,
  code: string,
  fillColor: string,
): void {
  const fontSize = Math.max(8, Math.floor(cellSize * 0.34))
  ctx.font = `600 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = IsDarkColor(fillColor) ? '#ffffff' : '#2a3140'
  ctx.fillText(code, left + cellSize / 2, top + cellSize / 2 + 0.5)
}

/**
 * 绘制像素图纸网格线（每格细线，每 10 格加粗）
 * @param ctx Canvas 2D 上下文
 * @param pattern 图案网格
 * @param cellSize 单元格尺寸
 * @param padding 外边距
 */
function DrawPixelGrid(
  ctx: CanvasRenderingContext2D,
  pattern: BeadPatternGrid,
  cellSize: number,
  padding: number,
): void {
  const left = padding
  const top = padding
  const right = padding + pattern.width * cellSize
  const bottom = padding + pattern.height * cellSize

  ctx.lineCap = 'butt'

  for (let x = 0; x <= pattern.width; x += 1) {
    const posX = padding + x * cellSize
    const isMajor = x % 10 === 0
    ctx.beginPath()
    ctx.moveTo(posX + 0.5, top)
    ctx.lineTo(posX + 0.5, bottom)
    ctx.lineWidth = isMajor ? 1.5 : 1
    ctx.strokeStyle = isMajor
      ? 'rgba(40, 56, 84, 0.45)'
      : 'rgba(40, 56, 84, 0.18)'
    ctx.stroke()
  }

  for (let y = 0; y <= pattern.height; y += 1) {
    const posY = padding + y * cellSize
    const isMajor = y % 10 === 0
    ctx.beginPath()
    ctx.moveTo(left, posY + 0.5)
    ctx.lineTo(right, posY + 0.5)
    ctx.lineWidth = isMajor ? 1.5 : 1
    ctx.strokeStyle = isMajor
      ? 'rgba(40, 56, 84, 0.45)'
      : 'rgba(40, 56, 84, 0.18)'
    ctx.stroke()
  }
}

/**
 * 将 Canvas 内容导出为 PNG 并触发下载
 * @param canvas 目标画布
 * @param fileName 下载文件名
 */
export function ExportCanvasAsPng(canvas: HTMLCanvasElement, fileName: string): void {
  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}
