/**
 * 文字转像素网格工具模块
 * 支持逐字字号/颜色/字重样式与可负字间距，输出带颜色的拼豆图案网格
 */

/** 单字垂直对齐方式 */
export type CharVerticalAlign = 'top' | 'middle' | 'bottom'

/** 垂直对齐选项（供 UI 使用） */
export const CHARALIGNOPTIONS: Array<{
  value: CharVerticalAlign
  label: string
}> = [
  { value: 'top', label: '居顶' },
  { value: 'middle', label: '居中' },
  { value: 'bottom', label: '居底' },
]

/** 单字样式 */
export type CharStyle = {
  color: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  lineThrough: boolean
  align: CharVerticalAlign
}

/**
 * 创建默认单字样式
 * @param color 默认颜色
 * @param fontSize 默认字号
 * @returns 完整单字样式
 */
export function CreateDefaultCharStyle(
  color: string,
  fontSize: number,
): CharStyle {
  return {
    color,
    fontSize,
    bold: true,
    italic: false,
    underline: false,
    lineThrough: false,
    align: 'middle',
  }
}

/**
 * 规范化单字样式，补齐缺失字段
 * @param style 局部样式
 * @param defaultColor 默认颜色
 * @param defaultFontSize 默认字号
 * @returns 完整样式
 */
export function NormalizeCharStyle(
  style: Partial<CharStyle> | undefined,
  defaultColor: string,
  defaultFontSize: number,
): CharStyle {
  const base = CreateDefaultCharStyle(defaultColor, defaultFontSize)
  const align =
    style?.align === 'top' || style?.align === 'bottom' || style?.align === 'middle'
      ? style.align
      : base.align
  return {
    color: style?.color || base.color,
    fontSize: style?.fontSize || base.fontSize,
    bold: style?.bold ?? base.bold,
    italic: style?.italic ?? base.italic,
    underline: style?.underline ?? base.underline,
    lineThrough: style?.lineThrough ?? base.lineThrough,
    align,
  }
}

/**
 * 按垂直对齐计算字在整行中的 Y 偏移
 * @param align 对齐方式
 * @param rowHeight 整行高度
 * @param glyphHeight 单字高度
 * @returns 顶部偏移量
 */
export function ResolveVerticalOffset(
  align: CharVerticalAlign,
  rowHeight: number,
  glyphHeight: number,
): number {
  if (align === 'top') {
    return 0
  }
  if (align === 'bottom') {
    return Math.max(0, rowHeight - glyphHeight)
  }
  return Math.floor((rowHeight - glyphHeight) / 2)
}

/** 二值像素网格 */
export type PixelGrid = {
  width: number
  height: number
  cells: boolean[][]
}

/** 带颜色的主体像素网格（null 表示空位） */
export type ColoredPixelGrid = {
  width: number
  height: number
  cells: Array<Array<string | null>>
}

/** 逐字采样配置 */
export type StyledTextToPixelOptions = {
  text: string
  fontFamily: string
  threshold: number
  letterSpacing: number
  charStyles: CharStyle[]
  defaultColor: string
  defaultFontSize: number
}

/** 珠子单元类型：空位 / 主体文字 / 外轮廓描边 */
export type BeadCellKind = 'empty' | 'fill' | 'outline'

/** 单个珠子格子 */
export type BeadCell = {
  kind: BeadCellKind
  color: string
}

/** 带描边层的拼豆图案网格 */
export type BeadPatternGrid = {
  width: number
  height: number
  cells: BeadCell[][]
}

/**
 * 组装 Canvas 字体字符串
 * @param fontSize 字号
 * @param fontFamily 字体族
 * @param bold 是否加粗
 * @param italic 是否倾斜
 * @returns font 字符串
 */
function BuildCanvasFont(
  fontSize: number,
  fontFamily: string,
  bold: boolean,
  italic: boolean,
): string {
  const style = italic ? 'italic' : 'normal'
  const weight = bold ? 'bold' : 'normal'
  return `${style} ${weight} ${fontSize}px ${fontFamily}`
}

/**
 * 将单个字符按样式渲染并采样为二值像素网格
 * @param char 单个字符
 * @param style 单字样式
 * @param fontFamily 字体
 * @param threshold 亮度阈值
 * @returns 裁剪后的像素网格
 */
export function ConvertCharToPixels(
  char: string,
  style: CharStyle,
  fontFamily: string,
  threshold: number,
): PixelGrid {
  const content = char
  if (!content || !content.trim()) {
    return { width: 0, height: 0, cells: [] }
  }

  const padding = 4
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) {
    return { width: 0, height: 0, cells: [] }
  }

  const safeSize = Math.max(12, Math.round(style.fontSize))
  const font = BuildCanvasFont(safeSize, fontFamily, style.bold, style.italic)
  measureCtx.font = font
  const metrics = measureCtx.measureText(content)
  const textWidth = Math.ceil(metrics.width)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || safeSize * 0.8)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || safeSize * 0.2)
  const textHeight = ascent + descent
  const decorationExtra = style.underline
    ? Math.max(2, Math.round(safeSize * 0.14))
    : 0

  const canvasWidth = Math.max(1, textWidth + padding * 2)
  const canvasHeight = Math.max(1, textHeight + padding * 2 + decorationExtra)
  measureCanvas.width = canvasWidth
  measureCanvas.height = canvasHeight

  measureCtx.fillStyle = '#ffffff'
  measureCtx.fillRect(0, 0, canvasWidth, canvasHeight)
  measureCtx.fillStyle = '#000000'
  measureCtx.font = font
  measureCtx.textBaseline = 'top'
  measureCtx.fillText(content, padding, padding)

  if (style.underline) {
    const underlineY =
      padding + ascent + Math.max(1, Math.round(safeSize * 0.06))
    const thickness = Math.max(1, Math.round(safeSize * 0.08))
    measureCtx.fillRect(padding, underlineY, textWidth, thickness)
  }

  if (style.lineThrough) {
    const strikeY = padding + Math.round(ascent * 0.58)
    const thickness = Math.max(1, Math.round(safeSize * 0.08))
    measureCtx.fillRect(padding, strikeY, textWidth, thickness)
  }

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
      row.push(luminance < threshold)
    }
    cells.push(row)
  }

  return TrimPixelGrid({ width: canvasWidth, height: canvasHeight, cells })
}

/**
 * 兼容旧接口：整段文字统一字号采样
 * @param options 文字、字号、字体与阈值配置
 * @returns 像素网格
 */
export function ConvertTextToPixels(options: {
  text: string
  fontSize: number
  fontFamily: string
  threshold: number
}): PixelGrid {
  return ConvertCharToPixels(
    options.text,
    CreateDefaultCharStyle('#000000', options.fontSize),
    options.fontFamily,
    options.threshold,
  )
}

/**
 * 按逐字样式与字间距合成彩色像素网格（字间距可为负以叠连）
 * @param options 逐字样式与采样配置
 * @returns 彩色像素网格
 */
export function ConvertStyledTextToPixels(
  options: StyledTextToPixelOptions,
): ColoredPixelGrid {
  const chars = Array.from(options.text)
  if (!chars.length) {
    return { width: 0, height: 0, cells: [] }
  }

  const spacing = Math.round(options.letterSpacing)
  const glyphParts: Array<
    | { type: 'glyph'; grid: PixelGrid; color: string; align: CharVerticalAlign }
    | { type: 'gap'; width: number }
  > = []

  chars.forEach((char, index) => {
    const style = NormalizeCharStyle(
      options.charStyles[index],
      options.defaultColor,
      options.defaultFontSize,
    )

    if (!char.trim()) {
      glyphParts.push({
        type: 'gap',
        width: Math.max(1, Math.round(style.fontSize * 0.4)),
      })
      return
    }

    const grid = ConvertCharToPixels(
      char,
      style,
      options.fontFamily,
      options.threshold,
    )
    glyphParts.push({
      type: 'glyph',
      grid,
      color: style.color,
      align: style.align,
    })
  })

  type PlacedGlyph = {
    x: number
    grid: PixelGrid
    color: string
    align: CharVerticalAlign
  }
  const placed: PlacedGlyph[] = []
  let cursorX = 0
  let maxHeight = 0

  glyphParts.forEach((part, index) => {
    if (part.type === 'glyph') {
      placed.push({
        x: cursorX,
        grid: part.grid,
        color: part.color,
        align: part.align,
      })
      maxHeight = Math.max(maxHeight, part.grid.height)
      cursorX += part.grid.width
    } else {
      cursorX += part.width
    }
    if (index < glyphParts.length - 1) {
      cursorX += spacing
    }
  })

  if (!placed.length || !maxHeight) {
    return { width: 0, height: 0, cells: [] }
  }

  const minX = Math.min(...placed.map((item) => item.x))
  const maxX = Math.max(...placed.map((item) => item.x + item.grid.width))
  const totalWidth = Math.max(1, maxX - minX)

  const cells: Array<Array<string | null>> = Array.from(
    { length: maxHeight },
    () => Array.from({ length: totalWidth }, () => null),
  )

  placed.forEach((item) => {
    const offsetX = item.x - minX
    const offsetY = ResolveVerticalOffset(
      item.align,
      maxHeight,
      item.grid.height,
    )
    for (let y = 0; y < item.grid.height; y += 1) {
      for (let x = 0; x < item.grid.width; x += 1) {
        if (!item.grid.cells[y][x]) {
          continue
        }
        const targetX = offsetX + x
        const targetY = offsetY + y
        if (
          targetX >= 0 &&
          targetX < totalWidth &&
          targetY >= 0 &&
          targetY < maxHeight
        ) {
          cells[targetY][targetX] = item.color
        }
      }
    }
  })

  return TrimColoredPixelGrid({ width: totalWidth, height: maxHeight, cells })
}

/**
 * 裁剪二值像素网格四周空白
 * @param grid 原始网格
 * @returns 紧凑网格
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
 * 裁剪彩色像素网格四周空白
 * @param grid 原始彩色网格
 * @returns 紧凑彩色网格
 */
export function TrimColoredPixelGrid(grid: ColoredPixelGrid): ColoredPixelGrid {
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
  const cells: Array<Array<string | null>> = []

  for (let y = minY; y <= maxY; y += 1) {
    cells.push(grid.cells[y].slice(minX, maxX + 1))
  }

  return { width, height, cells }
}

/**
 * 统计二值网格中点亮的珠子数量
 * @param grid 像素网格
 * @returns 珠子数量
 */
export function CountFilledBeads(grid: PixelGrid): number {
  return grid.cells.reduce((total, row) => {
    return total + row.filter(Boolean).length
  }, 0)
}

/**
 * 在彩色主体外围生成可拼接描边豆层
 * @param grid 彩色主体网格
 * @param thickness 描边层数（豆）
 * @param strokeColor 描边颜色
 * @returns 含主体与描边的图案网格
 */
export function BuildOutlinedColoredPattern(
  grid: ColoredPixelGrid,
  thickness: number,
  strokeColor: string,
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

  const cells: BeadCell[][] = []
  for (let y = 0; y < height; y += 1) {
    const row: BeadCell[] = []
    for (let x = 0; x < width; x += 1) {
      const originX = x - pad
      const originY = y - pad
      const fillColor =
        originX >= 0 &&
        originX < grid.width &&
        originY >= 0 &&
        originY < grid.height
          ? grid.cells[originY][originX]
          : null

      if (fillColor) {
        row.push({ kind: 'fill', color: fillColor })
      } else if (dilated[y][x]) {
        row.push({ kind: 'outline', color: strokeColor })
      } else {
        row.push({ kind: 'empty', color: '' })
      }
    }
    cells.push(row)
  }

  return { width, height, cells }
}

/**
 * 将彩色网格转为无描边的图案网格
 * @param grid 彩色主体网格
 * @returns 图案网格
 */
export function BuildColoredPattern(grid: ColoredPixelGrid): BeadPatternGrid {
  const cells: BeadCell[][] = grid.cells.map((row) =>
    row.map((color) =>
      color
        ? { kind: 'fill' as const, color }
        : { kind: 'empty' as const, color: '' },
    ),
  )
  return { width: grid.width, height: grid.height, cells }
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
      const kind = pattern.cells[y][x].kind
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

/**
 * 根据文字同步逐字样式数组长度，保留已有配置
 * @param text 文字
 * @param current 当前样式
 * @param defaultColor 默认颜色
 * @param defaultFontSize 默认字号
 * @returns 对齐后的样式数组
 */
export function SyncCharStyles(
  text: string,
  current: CharStyle[],
  defaultColor: string,
  defaultFontSize: number,
): CharStyle[] {
  return Array.from(text).map((_, index) =>
    NormalizeCharStyle(current[index], defaultColor, defaultFontSize),
  )
}
