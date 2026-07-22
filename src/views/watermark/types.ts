/**
 * 图片水印工具类型定义
 */

/** 处理状态 */
export type WatermarkStatus = 'pending' | 'processing' | 'completed' | 'error'

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

/** 水印图片项 */
export type WatermarkImageItem = {
  file: File
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
