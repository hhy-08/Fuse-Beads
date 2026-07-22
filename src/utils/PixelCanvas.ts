/**
 * 像素画布编辑器工具模块
 * 图层数据、绘制操作、扁平化网格与导出
 */

import { DrawBeadPattern, ExportCanvasAsPng } from '@/utils/DrawBeadPattern'
import {
  BuildColoredPattern,
  CountPatternBeads,
  type ColoredPixelGrid,
} from '@/utils/TextToPixels'
import { NormalizeHex } from '@/utils/MardColors'

/** 绘制工具 */
export type PixelTool = 'pen' | 'eraser' | 'eyedropper' | 'fill'

/** 单个图层 */
export type PixelLayer = {
  id: string
  name: string
  visible: boolean
  cells: Array<Array<string | null>>
}

/** 像素工程 */
export type PixelProject = {
  width: number
  height: number
  layers: PixelLayer[]
  activeLayerId: string
}

/** 拼豆图纸导出配置 */
export type PixelBeadExportOptions = {
  beadSize: number
  backgroundColor: string
  showGrid: boolean
  showColorCode: boolean
  fileName?: string
}

let layerSeed = 1

/**
 * 生成图层唯一 ID
 * @returns ID 字符串
 */
export function CreatePixelLayerId(): string {
  layerSeed += 1
  return `layer-${Date.now()}-${layerSeed}`
}

/**
 * 创建空白单元格矩阵
 * @param width 宽
 * @param height 高
 * @returns 单元格
 */
export function CreateEmptyCells(
  width: number,
  height: number,
): Array<Array<string | null>> {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  )
}

/**
 * 深拷贝单元格矩阵
 * @param cells 源矩阵
 * @returns 拷贝
 */
export function ClonePixelCells(
  cells: Array<Array<string | null>>,
): Array<Array<string | null>> {
  return cells.map((row) => row.slice())
}

/**
 * 创建空白图层
 * @param width 宽
 * @param height 高
 * @param name 名称
 * @returns 图层
 */
export function CreatePixelLayer(
  width: number,
  height: number,
  name: string,
): PixelLayer {
  return {
    id: CreatePixelLayerId(),
    name,
    visible: true,
    cells: CreateEmptyCells(width, height),
  }
}

/**
 * 创建默认像素工程
 * @param width 宽
 * @param height 高
 * @returns 工程
 */
export function CreatePixelProject(
  width: number,
  height: number,
): PixelProject {
  const safeWidth = ClampCanvasSize(width)
  const safeHeight = ClampCanvasSize(height)
  const layer = CreatePixelLayer(safeWidth, safeHeight, '图层 1')
  return {
    width: safeWidth,
    height: safeHeight,
    layers: [layer],
    activeLayerId: layer.id,
  }
}

/**
 * 限制画布尺寸
 * @param value 原始值
 * @returns 8~96
 */
export function ClampCanvasSize(value: number): number {
  return Math.min(96, Math.max(8, Math.round(value)))
}

/**
 * 查找当前活动图层
 * @param project 工程
 * @returns 图层或 null
 */
export function FindActiveLayer(project: PixelProject): PixelLayer | null {
  return (
    project.layers.find((layer) => layer.id === project.activeLayerId) || null
  )
}

/**
 * 规范化颜色为 HEX，失败返回 null
 * @param color 颜色
 * @returns HEX 或 null
 */
export function NormalizePaintColor(color: string): string | null {
  const trimmed = color.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return null
  }
  return NormalizeHex(trimmed)
}

/**
 * 在图层上写入单个像素
 * @param layer 图层
 * @param x 列
 * @param y 行
 * @param color HEX 或 null（擦除）
 */
export function SetLayerPixel(
  layer: PixelLayer,
  x: number,
  y: number,
  color: string | null,
) {
  if (y < 0 || y >= layer.cells.length) {
    return
  }
  const row = layer.cells[y]
  if (!row || x < 0 || x >= row.length) {
    return
  }
  row[x] = color
}

/**
 * 读取图层像素颜色
 * @param layer 图层
 * @param x 列
 * @param y 行
 * @returns 颜色或 null
 */
export function GetLayerPixel(
  layer: PixelLayer,
  x: number,
  y: number,
): string | null {
  if (y < 0 || y >= layer.cells.length) {
    return null
  }
  const row = layer.cells[y]
  if (!row || x < 0 || x >= row.length) {
    return null
  }
  return row[x]
}

/**
 * Bresenham 直线绘制（用于连续手绘）
 * @param layer 图层
 * @param x0 起点列
 * @param y0 起点行
 * @param x1 终点列
 * @param y1 终点行
 * @param color HEX 或 null
 */
export function DrawLayerLine(
  layer: PixelLayer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string | null,
) {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    SetLayerPixel(layer, x, y, color)
    if (x === x1 && y === y1) {
      break
    }
    const e2 = err * 2
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
}

/**
 * 同色区域填充
 * @param layer 图层
 * @param startX 起点列
 * @param startY 起点行
 * @param fillColor 填充色（null 表示擦除）
 */
export function FillLayerRegion(
  layer: PixelLayer,
  startX: number,
  startY: number,
  fillColor: string | null,
) {
  const height = layer.cells.length
  const width = layer.cells[0]?.length || 0
  if (!width || !height) {
    return
  }
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return
  }

  const target = GetLayerPixel(layer, startX, startY)
  if (target === fillColor) {
    return
  }

  const stack: Array<[number, number]> = [[startX, startY]]
  const visited = new Uint8Array(width * height)

  while (stack.length) {
    const point = stack.pop()
    if (!point) {
      continue
    }
    const [x, y] = point
    if (x < 0 || y < 0 || x >= width || y >= height) {
      continue
    }
    const index = y * width + x
    if (visited[index]) {
      continue
    }
    visited[index] = 1
    if (GetLayerPixel(layer, x, y) !== target) {
      continue
    }
    SetLayerPixel(layer, x, y, fillColor)
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
}

/**
 * 合并可见图层为彩色像素网格（上层覆盖下层）
 * @param project 工程
 * @returns ColoredPixelGrid
 */
export function FlattenProjectToGrid(project: PixelProject): ColoredPixelGrid {
  const cells = CreateEmptyCells(project.width, project.height)
  for (const layer of project.layers) {
    if (!layer.visible) {
      continue
    }
    for (let y = 0; y < project.height; y += 1) {
      for (let x = 0; x < project.width; x += 1) {
        const color = layer.cells[y]?.[x] ?? null
        if (color) {
          cells[y][x] = color
        }
      }
    }
  }
  return {
    width: project.width,
    height: project.height,
    cells,
  }
}

/**
 * 取色：从扁平结果读取合成色
 * @param project 工程
 * @param x 列
 * @param y 行
 * @returns HEX 或 null
 */
export function SampleProjectPixel(
  project: PixelProject,
  x: number,
  y: number,
): string | null {
  for (let i = project.layers.length - 1; i >= 0; i -= 1) {
    const layer = project.layers[i]
    if (!layer.visible) {
      continue
    }
    const color = GetLayerPixel(layer, x, y)
    if (color) {
      return color
    }
  }
  return null
}

/**
 * 统计已着色像素数
 * @param grid 网格
 * @returns 数量
 */
export function CountFilledPixels(grid: ColoredPixelGrid): number {
  let count = 0
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.cells[y][x]) {
        count += 1
      }
    }
  }
  return count
}

/**
 * 深拷贝彩色网格（写入 Vuex 用）
 * @param grid 源网格
 * @returns 拷贝
 */
export function CloneColoredPixelGrid(
  grid: ColoredPixelGrid,
): ColoredPixelGrid {
  return {
    width: grid.width,
    height: grid.height,
    cells: ClonePixelCells(grid.cells),
  }
}

/**
 * 将工程导出为放大像素图 PNG
 * @param project 工程
 * @param scale 每豆像素边长
 * @param fileName 文件名
 */
export function ExportProjectPixelPng(
  project: PixelProject,
  scale: number,
  fileName = 'pixel-art.png',
) {
  const grid = FlattenProjectToGrid(project)
  const cell = Math.min(64, Math.max(1, Math.round(scale)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, grid.width * cell)
  canvas.height = Math.max(1, grid.height * cell)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = grid.cells[y][x]
      if (!color) {
        continue
      }
      ctx.fillStyle = color
      ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }
  ExportCanvasAsPng(canvas, fileName)
}

/**
 * 将工程导出为拼豆图纸 PNG
 * @param project 工程
 * @param options 图纸配置
 */
export function ExportProjectBeadPng(
  project: PixelProject,
  options: PixelBeadExportOptions,
) {
  const grid = FlattenProjectToGrid(project)
  const pattern = BuildColoredPattern(grid)
  const counts = CountPatternBeads(pattern)
  if (!counts.totalCount) {
    throw new Error('画布为空，请先绘制像素')
  }
  const canvas = document.createElement('canvas')
  DrawBeadPattern(canvas, pattern, {
    beadSize: options.beadSize,
    backgroundColor: options.backgroundColor,
    showGrid: options.showGrid,
    showColorCode: options.showColorCode,
  })
  ExportCanvasAsPng(canvas, options.fileName || 'pixel-拼豆图纸.png')
}

/**
 * 调整工程尺寸（保留左上区域内容）
 * @param project 工程
 * @param width 新宽
 * @param height 新高
 * @returns 新工程
 */
export function ResizePixelProject(
  project: PixelProject,
  width: number,
  height: number,
): PixelProject {
  const nextWidth = ClampCanvasSize(width)
  const nextHeight = ClampCanvasSize(height)
  const layers = project.layers.map((layer) => {
    const cells = CreateEmptyCells(nextWidth, nextHeight)
    const copyH = Math.min(project.height, nextHeight)
    const copyW = Math.min(project.width, nextWidth)
    for (let y = 0; y < copyH; y += 1) {
      for (let x = 0; x < copyW; x += 1) {
        cells[y][x] = layer.cells[y]?.[x] ?? null
      }
    }
    return { ...layer, cells }
  })
  return {
    width: nextWidth,
    height: nextHeight,
    layers,
    activeLayerId: project.activeLayerId,
  }
}

/**
 * 在工程中新增图层
 * @param project 工程
 * @returns 更新后的工程
 */
export function AddPixelLayer(project: PixelProject): PixelProject {
  const index = project.layers.length + 1
  const layer = CreatePixelLayer(
    project.width,
    project.height,
    `图层 ${index}`,
  )
  return {
    ...project,
    layers: [...project.layers, layer],
    activeLayerId: layer.id,
  }
}

/**
 * 删除图层（至少保留一层）
 * @param project 工程
 * @param layerId 目标 ID
 * @returns 更新后的工程
 */
export function RemovePixelLayer(
  project: PixelProject,
  layerId: string,
): PixelProject {
  if (project.layers.length <= 1) {
    return project
  }
  const layers = project.layers.filter((layer) => layer.id !== layerId)
  const activeStillExists = layers.some(
    (layer) => layer.id === project.activeLayerId,
  )
  return {
    ...project,
    layers,
    activeLayerId: activeStillExists
      ? project.activeLayerId
      : layers[layers.length - 1].id,
  }
}

/**
 * 清空指定图层
 * @param layer 图层
 */
export function ClearPixelLayer(layer: PixelLayer) {
  for (let y = 0; y < layer.cells.length; y += 1) {
    for (let x = 0; x < layer.cells[y].length; x += 1) {
      layer.cells[y][x] = null
    }
  }
}

/**
 * 触发下载用的时间戳后缀
 * @returns 字符串
 */
export function ResolvePixelExportStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
