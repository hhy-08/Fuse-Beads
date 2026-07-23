/**
 * 图片水印工具类型定义
 */

/** 处理状态 */
export type WatermarkStatus = 'pending' | 'processing' | 'completed' | 'error'

/** 素材类型 */
export type WatermarkItemKind = 'image' | 'document'

/** 九宫格位置 */
export type WatermarkPositionId =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'middleLeft'
  | 'center'
  | 'middleRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'

/** 水印列表项（图片或文本文档排版页） */
export type WatermarkImageItem = {
  file: File
  /** 列表展示名（文档多页会带页码） */
  displayName: string
  kind: WatermarkItemKind
  url: string
  image: HTMLImageElement
  status: WatermarkStatus
  processedData: string
}

/** 水印坐标 */
export type WatermarkPoint = {
  x: number
  y: number
}

/** 水印绘制设置 */
export type WatermarkSettings = {
  text: string
  color: string
  fontSize: number
  opacity: number
  position: WatermarkPositionId
  rotation: number
  isTiled: boolean
  tileSpacingX: number
  tileSpacingY: number
  isDraggable: boolean
  watermarkPos: WatermarkPoint
}
