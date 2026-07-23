/**
 * 图纸尺寸计算器工具模块
 * 根据图案像素宽高估算拼豆板规格、豆子总数，并可统计色号用量
 */

import { DecodeBeadBlueprint } from '@/utils/BeadBlueprintDecoder'
import { CountColorUsage } from '@/utils/ImageToPixels'
import { FindMardColorByHex, type MardColor } from '@/utils/MardColors'
import type { ColoredPixelGrid } from '@/utils/TextToPixels'

/** 标准拼豆板规格 */
export type BeadBoardSpec = {
  id: string
  name: string
  width: number
  height: number
  note: string
}

/** 板材排布结果 */
export type BoardLayoutResult = {
  board: BeadBoardSpec
  boardsX: number
  boardsY: number
  totalBoards: number
  usedWidth: number
  usedHeight: number
  leftoverWidth: number
  leftoverHeight: number
  fitsSingle: boolean
}

/** 尺寸计算结果 */
export type PatternSizeResult = {
  width: number
  height: number
  strokeWidth: number
  finalWidth: number
  finalHeight: number
  fillBeads: number
  outlineBeads: number
  totalBeads: number
  physicalWidthMm: number
  physicalHeightMm: number
  layouts: BoardLayoutResult[]
  recommended: BoardLayoutResult | null
}

/** 色号用量项 */
export type ColorUsageItem = {
  code: string
  hex: string
  count: number
  percent: number
}

/** 常见拼豆板（以钉板孔位计） */
const STANDARDBOARDS: BeadBoardSpec[] = [
  {
    id: 'square-14',
    name: '迷你方板 14×14',
    width: 14,
    height: 14,
    note: '小图案 / 试色',
  },
  {
    id: 'square-29',
    name: '标准方板 29×29',
    width: 29,
    height: 29,
    note: '最常用拼豆板',
  },
  {
    id: 'rect-29x58',
    name: '长条板 29×58',
    width: 29,
    height: 58,
    note: '竖幅或横幅长图',
  },
  {
    id: 'square-52',
    name: '中型方板 52×52',
    width: 52,
    height: 52,
    note: '中等尺寸整板',
  },
  {
    id: 'square-58',
    name: '大方板 58×58',
    width: 58,
    height: 58,
    note: '约 2×2 标准方板',
  },
]

/** 单豆中心距（毫米），标准拼豆约 5mm */
const BEADPITCHMM = 5

/**
 * 获取标准拼豆板列表
 * @returns 板规格
 */
export function GetStandardBeadBoards(): BeadBoardSpec[] {
  return STANDARDBOARDS.map((item) => ({ ...item }))
}

/**
 * 限制图案尺寸
 * @param value 原始值
 * @returns 1~256
 */
export function ClampPatternSize(value: number): number {
  return Math.min(256, Math.max(1, Math.round(value) || 1))
}

/**
 * 限制描边层数
 * @param value 原始值
 * @returns 0~8
 */
export function ClampStrokeWidth(value: number): number {
  return Math.min(8, Math.max(0, Math.round(value) || 0))
}

/**
 * 计算描边后的外轮廓豆数（满铺矩形 + 外扩描边）
 * @param width 主体宽
 * @param height 主体高
 * @param strokeWidth 描边层数
 * @returns 描边豆数
 */
export function EstimateOutlineBeads(
  width: number,
  height: number,
  strokeWidth: number,
): number {
  const w = ClampPatternSize(width)
  const h = ClampPatternSize(height)
  const stroke = ClampStrokeWidth(strokeWidth)
  if (stroke <= 0) {
    return 0
  }
  const outerW = w + stroke * 2
  const outerH = h + stroke * 2
  return outerW * outerH - w * h
}

/**
 * 计算某块板对图案的排布
 * @param patternWidth 图案宽
 * @param patternHeight 图案高
 * @param board 板规格
 * @returns 排布结果
 */
export function CalculateBoardLayout(
  patternWidth: number,
  patternHeight: number,
  board: BeadBoardSpec,
): BoardLayoutResult {
  const boardsX = Math.ceil(patternWidth / board.width)
  const boardsY = Math.ceil(patternHeight / board.height)
  const usedWidth = boardsX * board.width
  const usedHeight = boardsY * board.height
  return {
    board,
    boardsX,
    boardsY,
    totalBoards: boardsX * boardsY,
    usedWidth,
    usedHeight,
    leftoverWidth: usedWidth - patternWidth,
    leftoverHeight: usedHeight - patternHeight,
    fitsSingle: boardsX === 1 && boardsY === 1,
  }
}

/**
 * 按总板数、余量综合排序，选出推荐板型
 * @param layouts 全部排布
 * @returns 推荐项
 */
export function PickRecommendedLayout(
  layouts: BoardLayoutResult[],
): BoardLayoutResult | null {
  if (!layouts.length) {
    return null
  }
  const ranked = [...layouts].sort((left, right) => {
    if (left.totalBoards !== right.totalBoards) {
      return left.totalBoards - right.totalBoards
    }
    const leftWaste =
      left.leftoverWidth * left.usedHeight +
      left.leftoverHeight * left.usedWidth
    const rightWaste =
      right.leftoverWidth * right.usedHeight +
      right.leftoverHeight * right.usedWidth
    if (leftWaste !== rightWaste) {
      return leftWaste - rightWaste
    }
    return left.board.width * left.board.height - right.board.width * right.board.height
  })
  return ranked[0]
}

/**
 * 根据宽高与描边计算尺寸与板材方案
 * @param width 图案宽（豆）
 * @param height 图案高（豆）
 * @param strokeWidth 外轮廓描边层数
 * @returns 计算结果
 */
export function CalculatePatternSize(
  width: number,
  height: number,
  strokeWidth = 0,
): PatternSizeResult {
  const safeWidth = ClampPatternSize(width)
  const safeHeight = ClampPatternSize(height)
  const stroke = ClampStrokeWidth(strokeWidth)
  const finalWidth = safeWidth + stroke * 2
  const finalHeight = safeHeight + stroke * 2
  const fillBeads = safeWidth * safeHeight
  const outlineBeads = EstimateOutlineBeads(safeWidth, safeHeight, stroke)
  const totalBeads = fillBeads + outlineBeads
  const layouts = GetStandardBeadBoards().map((board) =>
    CalculateBoardLayout(finalWidth, finalHeight, board),
  )
  const recommended = PickRecommendedLayout(layouts)

  return {
    width: safeWidth,
    height: safeHeight,
    strokeWidth: stroke,
    finalWidth,
    finalHeight,
    fillBeads,
    outlineBeads,
    totalBeads,
    physicalWidthMm: finalWidth * BEADPITCHMM,
    physicalHeightMm: finalHeight * BEADPITCHMM,
    layouts,
    recommended,
  }
}

/**
 * 将毫米转为厘米文案
 * @param mm 毫米
 * @returns 文案
 */
export function FormatPhysicalCm(mm: number): string {
  const cm = mm / 10
  return `${cm.toFixed(1)} cm`
}

/**
 * 从彩色网格生成色号用量统计
 * @param grid 网格
 * @returns 用量列表
 */
export function BuildColorUsageStats(
  grid: ColoredPixelGrid,
): ColorUsageItem[] {
  const usage = CountColorUsage(grid)
  const total = usage.reduce((sum, item) => sum + item.count, 0) || 1
  return usage.map((item) => {
    const matched: MardColor | null = FindMardColorByHex(item.hex)
    return {
      code: matched?.code || item.code,
      hex: matched?.hex || item.hex,
      count: item.count,
      percent: Math.round((item.count / total) * 1000) / 10,
    }
  })
}

/**
 * 上传图纸并统计色号用量（优先读格内标注色号，否则按色块识别）
 * @param image 图片
 * @param width 目标宽
 * @param height 目标高
 * @returns 网格与用量
 */
export async function AnalyzeImageColorUsage(
  image: HTMLImageElement,
  width: number,
  height: number,
): Promise<{
  grid: ColoredPixelGrid
  usage: ColorUsageItem[]
  filled: number
  labeledCount: number
  sampledCount: number
  source: 'label' | 'mixed' | 'color'
}> {
  const decoded = await DecodeBeadBlueprint(
    image,
    ClampPatternSize(width),
    ClampPatternSize(height),
  )
  const usage = BuildColorUsageStats(decoded.grid)
  const filled = usage.reduce((sum, item) => sum + item.count, 0)
  return {
    grid: decoded.grid,
    usage,
    filled,
    labeledCount: decoded.labeledCount,
    sampledCount: decoded.sampledCount,
    source: decoded.source,
  }
}

/**
 * 从 File 加载图片
 * @param file 文件
 * @returns 图片元素
 */
export function LoadCalculatorImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}
