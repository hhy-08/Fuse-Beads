/**
 * AI 智能抠图工具类型定义
 */

/** 抠图模型档位 */
export type MattingModelId = 'u2netp' | 'silueta'

/** 抠图进度步骤 */
export type MattingProgressStep =
  | 'idle'
  | 'downloading'
  | 'processing'
  | 'postprocessing'
  | 'complete'
  | 'error'

/** 模型档位选项（展示用） */
export type MattingModelOption = {
  id: MattingModelId
  label: string
  sizeHint: string
  description: string
}

/** 上传后的原图信息 */
export type MattingSourceImage = {
  file: File
  name: string
  url: string
  width: number
  height: number
  size: number
}

/** 抠图结果 */
export type MattingResult = {
  blob: Blob
  url: string
  modelId: MattingModelId
}
