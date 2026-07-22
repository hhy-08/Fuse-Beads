/**
 * 文字转像素网格工具模块
 * 通过离屏 Canvas 渲染文字并采样为二值像素矩阵
 */

/** 像素网格结果 */
export type PixelGrid = {
  width: number
  height: number
  cells: boolean[][]
}

/** 文字转像素配置 */
export type TextToPixelOptions = {
  text: string
  fontSize: number
  fontFamily: string
  threshold: number
}

/**
 * 将输入文字渲染为离屏 Canvas，并按亮度阈值采样为像素网格
 * @param options 文字、字号、字体与阈值配置
 * @returns 像素网格，无有效内容时返回空网格
 */
export function ConvertTextToPixels(options: TextToPixelOptions): PixelGrid {
  const content = options.text.trim()
  if (!content) {
    return { width: 0, height: 0, cells: [] }
  }

  const padding = 4
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) {
    return { width: 0, height: 0, cells: [] }
  }

  const font = `bold ${options.fontSize}px ${options.fontFamily}`
  measureCtx.font = font
  const metrics = measureCtx.measureText(content)
  const textWidth = Math.ceil(metrics.width)
  const textHeight = Math.ceil(
    (metrics.actualBoundingBoxAscent || options.fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || options.fontSize * 0.2),
  )

  const canvasWidth = Math.max(1, textWidth + padding * 2)
  const canvasHeight = Math.max(1, textHeight + padding * 2)
  measureCanvas.width = canvasWidth
  measureCanvas.height = canvasHeight

  measureCtx.fillStyle = '#ffffff'
  measureCtx.fillRect(0, 0, canvasWidth, canvasHeight)
  measureCtx.fillStyle = '#000000'
  measureCtx.font = font
  measureCtx.textBaseline = 'top'
  measureCtx.fillText(content, padding, padding)

  const imageData = measureCtx.getImageData(0, 0, canvasWidth, canvasHeight)
  const cells: boolean[][] = []

  for (let y = 0; y < canvasHeight; y += 1) {
    const row: boolean[] = []
    for (let x = 0; x < canvasWidth; x += 1) {
      const index = (y * canvasWidth + x) * 4
      const red = imageData.data[index]
      const green = imageData.data[index + 1]
      const blue = imageData.data[index + 2]
      const luminance = (red + green + blue) / 3
      row.push(luminance < options.threshold)
    }
    cells.push(row)
  }

  return TrimPixelGrid({ width: canvasWidth, height: canvasHeight, cells })
}

/**
 * 裁剪像素网格四周的空白行与列
 * @param grid 原始像素网格
 * @returns 裁剪后的紧凑像素网格
 */
export function TrimPixelGrid(grid: PixelGrid): PixelGrid {
  if (!grid.cells.length) {
    return grid
  }

  let minX = grid.width
  let maxX = -1
  let minY = grid.height
  let maxY = -1

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.cells[y][x]) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return { width: 0, height: 0, cells: [] }
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const cells: boolean[][] = []

  for (let y = minY; y <= maxY; y += 1) {
    cells.push(grid.cells[y].slice(minX, maxX + 1))
  }

  return { width, height, cells }
}

/**
 * 统计像素网格中被点亮的珠子数量
 * @param grid 像素网格
 * @returns 珠子数量
 */
export function CountFilledBeads(grid: PixelGrid): number {
  return grid.cells.reduce((total, row) => {
    return total + row.filter(Boolean).length
  }, 0)
}

/** 珠子单元类型：空位 / 主体文字 / 外轮廓描边 */
export type BeadCellKind = 'empty' | 'fill' | 'outline'

/** 带描边层的拼豆图案网格 */
export type BeadPatternGrid = {
  width: number
  height: number
  cells: BeadCellKind[][]
}

/**
 * 在文字像素外围生成可拼接的描边豆层
 * 使用切比雪夫距离外扩，描边宽度按「豆数」计
 * @param grid 主体文字像素网格
 * @param thickness 描边层数（豆），至少为 1
 * @returns 含主体与描边的图案网格
 */
export function BuildOutlinedPattern(
  grid: PixelGrid,
  thickness: number,
): BeadPatternGrid {
  if (!grid.width || !grid.height) {
    return { width: 0, height: 0, cells: [] }
  }

  const outlineLayers = Math.max(1, Math.round(thickness))
  const pad = outlineLayers
  const width = grid.width + pad * 2
  const height = grid.height + pad * 2
  const dilated: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  )

  // 将主体外扩 thickness 圈，得到描边候选区域
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (!grid.cells[y][x]) {
        continue
      }
      for (let dy = -outlineLayers; dy <= outlineLayers; dy += 1) {
        for (let dx = -outlineLayers; dx <= outlineLayers; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) > outlineLayers) {
            continue
          }
          dilated[y + pad + dy][x + pad + dx] = true
        }
      }
    }
  }

  const cells: BeadCellKind[][] = []
  for (let y = 0; y < height; y += 1) {
    const row: BeadCellKind[] = []
    for (let x = 0; x < width; x += 1) {
      const originX = x - pad
      const originY = y - pad
      const isFill =
        originX >= 0 &&
        originX < grid.width &&
        originY >= 0 &&
        originY < grid.height &&
        grid.cells[originY][originX]

      if (isFill) {
        row.push('fill')
      } else if (dilated[y][x]) {
        row.push('outline')
      } else {
        row.push('empty')
      }
    }
    cells.push(row)
  }

  return { width, height, cells }
}

/**
 * 统计图案中各类珠子数量
 * @param pattern 带描边的图案网格
 * @returns 主体、描边与合计数量
 */
export function CountPatternBeads(pattern: BeadPatternGrid): {
  fillCount: number
  outlineCount: number
  totalCount: number
} {
  let fillCount = 0
  let outlineCount = 0

  for (let y = 0; y < pattern.height; y += 1) {
    for (let x = 0; x < pattern.width; x += 1) {
      const kind = pattern.cells[y][x]
      if (kind === 'fill') {
        fillCount += 1
      } else if (kind === 'outline') {
        outlineCount += 1
      }
    }
  }

  return {
    fillCount,
    outlineCount,
    totalCount: fillCount + outlineCount,
  }
}
