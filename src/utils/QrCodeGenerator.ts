/**
 * 二维码生成工具模块
 * 基于 qrcode 生成、jsQR 解码，支持自定义颜色、嵌入图标与多格式导出
 */

import QRCode from 'qrcode'
import jsQR from 'jsqr'

/** 纠错等级 */
export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'

/** 导出图片格式 */
export type QrExportFormat = 'png' | 'jpeg' | 'webp'

/** 二维码生成参数 */
export type QrGenerateOptions = {
  text: string
  size: number
  foreground: string
  background: string
  margin: number
  errorCorrectionLevel: QrErrorLevel
  logoFile?: File | null
  logoScale?: number
}

/** 导出参数 */
export type QrExportOptions = QrGenerateOptions & {
  format?: QrExportFormat
  quality?: number
}

/** 导出格式选项（页面下拉） */
export type QrFormatOption = {
  value: QrExportFormat
  label: string
  mime: string
  extension: string
  supportsQuality: boolean
}

const FORMAT_OPTIONS: QrFormatOption[] = [
  {
    value: 'png',
    label: 'PNG',
    mime: 'image/png',
    extension: 'png',
    supportsQuality: false,
  },
  {
    value: 'jpeg',
    label: 'JPEG',
    mime: 'image/jpeg',
    extension: 'jpg',
    supportsQuality: true,
  },
  {
    value: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    extension: 'webp',
    supportsQuality: true,
  },
]

/**
 * 获取可选导出格式列表
 * @returns 格式选项
 */
export function GetQrExportFormats(): QrFormatOption[] {
  return FORMAT_OPTIONS
}

/**
 * 解析导出格式元信息
 * @param format 格式
 * @returns 元信息
 */
export function ResolveQrFormatOption(format: QrExportFormat): QrFormatOption {
  return (
    FORMAT_OPTIONS.find((item) => item.value === format) || FORMAT_OPTIONS[0]
  )
}

/**
 * 将图片文件读为 HTMLImageElement
 * @param file 图片文件
 * @returns 图片元素
 */
function LoadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图标加载失败'))
    }
    image.src = url
  })
}

/**
 * 在画布中心绘制带白底的小图标
 * @param ctx 画布上下文
 * @param canvasSize 画布边长
 * @param logoImage 图标
 * @param logoScale 图标相对二维码的比例（0.12~0.28）
 */
function DrawCenteredLogo(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  logoImage: HTMLImageElement,
  logoScale: number,
) {
  const safeScale = Math.min(0.28, Math.max(0.12, logoScale))
  const logoSize = Math.round(canvasSize * safeScale)
  const padding = Math.max(4, Math.round(logoSize * 0.12))
  const boxSize = logoSize + padding * 2
  const boxX = Math.round((canvasSize - boxSize) / 2)
  const boxY = Math.round((canvasSize - boxSize) / 2)
  const logoX = boxX + padding
  const logoY = boxY + padding
  const radius = Math.max(6, Math.round(boxSize * 0.12))

  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(boxX + radius, boxY)
  ctx.arcTo(boxX + boxSize, boxY, boxX + boxSize, boxY + boxSize, radius)
  ctx.arcTo(boxX + boxSize, boxY + boxSize, boxX, boxY + boxSize, radius)
  ctx.arcTo(boxX, boxY + boxSize, boxX, boxY, radius)
  ctx.arcTo(boxX, boxY, boxX + boxSize, boxY, radius)
  ctx.closePath()
  ctx.fill()
  ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize)
  ctx.restore()
}

/**
 * 将画布压成不透明底（JPEG 等不支持透明）
 * @param source 源画布
 * @param fillColor 填充色
 * @returns 新画布
 */
function FlattenCanvas(
  source: HTMLCanvasElement,
  fillColor: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }
  ctx.fillStyle = fillColor || '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0)
  return canvas
}

/**
 * 生成二维码画布（可含中心图标）
 * @param options 生成参数
 * @returns 画布
 */
export async function GenerateQrCanvas(
  options: QrGenerateOptions,
): Promise<HTMLCanvasElement> {
  const text = options.text.trim()
  if (!text) {
    throw new Error('请输入文字或链接')
  }

  const size = Math.min(1200, Math.max(128, Math.round(options.size)))
  const margin = Math.min(8, Math.max(0, Math.round(options.margin)))
  const hasLogo = Boolean(options.logoFile)
  const errorLevel: QrErrorLevel = hasLogo
    ? 'H'
    : options.errorCorrectionLevel

  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin,
    errorCorrectionLevel: errorLevel,
    color: {
      dark: options.foreground || '#000000',
      light: options.background || '#ffffff',
    },
  })

  if (options.logoFile) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 不可用')
    }
    const logoImage = await LoadImageFromFile(options.logoFile)
    DrawCenteredLogo(ctx, canvas.width, logoImage, options.logoScale ?? 0.2)
  }

  return canvas
}

/**
 * 将画布转为指定 MIME 的 Blob
 * @param canvas 画布
 * @param mime MIME 类型
 * @param quality 质量 0~1（JPEG/WebP）
 * @returns Blob
 */
function CanvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const done = (blob: Blob | null) => {
      if (!blob) {
        reject(new Error('图片导出失败'))
        return
      }
      resolve(blob)
    }
    if (typeof quality === 'number') {
      canvas.toBlob(done, mime, quality)
      return
    }
    canvas.toBlob(done, mime)
  })
}

/**
 * 将二维码导出为指定格式 Blob
 * @param options 导出参数
 * @returns 图片 Blob
 */
export async function GenerateQrImageBlob(
  options: QrExportOptions,
): Promise<Blob> {
  const format = options.format || 'png'
  const meta = ResolveQrFormatOption(format)
  const canvas = await GenerateQrCanvas(options)
  const exportCanvas =
    format === 'jpeg'
      ? FlattenCanvas(canvas, options.background || '#ffffff')
      : canvas

  const qualityRatio =
    typeof options.quality === 'number'
      ? Math.min(1, Math.max(0.1, options.quality / 100))
      : 0.92

  return CanvasToBlob(
    exportCanvas,
    meta.mime,
    meta.supportsQuality ? qualityRatio : undefined,
  )
}

/**
 * 将二维码导出为 PNG Blob（预览默认）
 * @param options 生成参数
 * @returns PNG Blob
 */
export async function GenerateQrPngBlob(
  options: QrGenerateOptions,
): Promise<Blob> {
  return GenerateQrImageBlob({ ...options, format: 'png' })
}

/**
 * 触发浏览器下载 Blob
 * @param blob 文件内容
 * @param filename 文件名
 */
export function TriggerQrDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 根据内容与格式生成默认下载文件名
 * @param text 二维码内容
 * @param format 导出格式
 * @returns 文件名
 */
export function ResolveQrFilename(
  text: string,
  format: QrExportFormat = 'png',
): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
  const preview = text
    .trim()
    .replace(/https?:\/\//i, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
    .slice(0, 24)
  const extension = ResolveQrFormatOption(format).extension
  return `qrcode-${preview || 'export'}-${stamp}.${extension}`
}

/** 支持解码的图片类型提示 */
export const QRDECODEACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp'

/**
 * 将图片绘制到 canvas 并取出 ImageData
 * @param image 图片元素
 * @returns ImageData
 */
function ImageToImageData(image: HTMLImageElement): ImageData {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('图片尺寸无效')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }
  ctx.drawImage(image, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

/**
 * 从 ImageData 解码二维码内容
 * @param imageData 像素数据
 * @returns 解码文本
 */
export function DecodeQrFromImageData(imageData: ImageData): string {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  if (!result?.data) {
    throw new Error('未识别到二维码，请换更清晰的图片重试')
  }
  return result.data
}

/**
 * 从 HTMLImageElement 解码二维码
 * @param image 图片
 * @returns 解码文本
 */
export function DecodeQrFromImageElement(image: HTMLImageElement): string {
  return DecodeQrFromImageData(ImageToImageData(image))
}

/**
 * 从图片 File 解码二维码
 * @param file 图片文件
 * @returns 解码文本
 */
export async function DecodeQrFromImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    throw new Error('请上传 PNG / JPG / WebP 等图片文件')
  }
  const image = await LoadImageFromFile(file)
  return DecodeQrFromImageElement(image)
}

/**
 * 从剪贴板图片项解码二维码
 * @param item 剪贴板图片项
 * @returns 解码文本
 */
export async function DecodeQrFromClipboardItem(
  item: ClipboardItem,
): Promise<string> {
  const imageType = item.types.find((type) => type.startsWith('image/'))
  if (!imageType) {
    throw new Error('剪贴板中没有图片')
  }
  const blob = await item.getType(imageType)
  const file = new File([blob], `clipboard.${imageType.split('/')[1] || 'png'}`, {
    type: imageType,
  })
  return DecodeQrFromImageFile(file)
}
