/**
 * 拼豆图案 Canvas 绘制与导出工具模块
 */

import type { PixelGrid } from './TextToPixels'

/** 绘制配置 */
export type DrawBeadOptions = {
  beadSize: number
  beadColor: string
  backgroundColor: string
  showStroke: boolean
  strokeColor: string
  strokeWidth: number
  showGrid: boolean
  gridColor: string
}

/**
 * 根据像素网格在目标 Canvas 上绘制拼豆图案
 * @param canvas 目标画布
 * @param grid 像素网格
 * @param options 珠子尺寸、颜色与描边等配置
 */
export function DrawBeadPattern(
  canvas: HTMLCanvasElement,
  grid: PixelGrid,
  options: DrawBeadOptions,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const gap = Math.max(1, Math.round(options.beadSize * 0.08))
  const cellSize = options.beadSize + gap
  const padding = Math.max(12, Math.round(options.beadSize * 0.6))

  if (!grid.width || !grid.height) {
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

  canvas.width = grid.width * cellSize + padding * 2 - gap
  canvas.height = grid.height * cellSize + padding * 2 - gap

  ctx.fillStyle = options.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (options.showGrid) {
    DrawGuideGrid(ctx, grid, cellSize, padding, gap, options.gridColor)
  }

  const radius = options.beadSize / 2

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (!grid.cells[y][x]) {
        continue
      }

      const centerX = padding + x * cellSize + radius
      const centerY = padding + y * cellSize + radius

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = options.beadColor
      ctx.fill()

      if (options.showStroke && options.strokeWidth > 0) {
        ctx.lineWidth = options.strokeWidth
        ctx.strokeStyle = options.strokeColor
        ctx.stroke()
      }

      // 珠子高光，增强立体感
      ctx.beginPath()
      ctx.arc(
        centerX - radius * 0.28,
        centerY - radius * 0.28,
        radius * 0.22,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fill()
    }
  }
}

/**
 * 绘制辅助定位网格线
 * @param ctx Canvas 2D 上下文
 * @param grid 像素网格
 * @param cellSize 单元格尺寸
 * @param padding 外边距
 * @param gap 珠子间距
 * @param gridColor 网格颜色
 */
function DrawGuideGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  cellSize: number,
  padding: number,
  gap: number,
  gridColor: string,
): void {
  const width = grid.width * cellSize - gap
  const height = grid.height * cellSize - gap

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1

  for (let x = 0; x <= grid.width; x += 1) {
    const posX = padding + x * cellSize - gap / 2
    ctx.beginPath()
    ctx.moveTo(posX, padding - gap / 2)
    ctx.lineTo(posX, padding - gap / 2 + height + gap)
    ctx.stroke()
  }

  for (let y = 0; y <= grid.height; y += 1) {
    const posY = padding + y * cellSize - gap / 2
    ctx.beginPath()
    ctx.moveTo(padding - gap / 2, posY)
    ctx.lineTo(padding - gap / 2 + width + gap, posY)
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
