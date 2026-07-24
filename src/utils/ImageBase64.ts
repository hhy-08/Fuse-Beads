/**
 * 图片 ↔ Base64 互转模块
 * 含体积估算、超大图限制与 Data URL 解析
 */

import { FormatFileSize } from '@/utils/ImageCompress'

/** 建议警告阈值：超过后提示不建议转 Base64（1 MB） */
export const IMAGE_BASE64_WARN_BYTES = 1 * 1024 * 1024

/** 硬性上限：超过则拒绝转换（5 MB） */
export const IMAGE_BASE64_MAX_BYTES = 5 * 1024 * 1024

/** Base64 文本硬性上限（约对应 5 MB 二进制 + 头信息余量） */
export const IMAGE_BASE64_MAX_CHARS = Math.ceil(IMAGE_BASE64_MAX_BYTES * (4 / 3)) + 256

/** 体积检查等级 */
export type ImageBase64LimitLevel = 'ok' | 'warn' | 'block'

/** 体积检查结果 */
export type ImageBase64LimitResult = {
  level: ImageBase64LimitLevel
  allowed: boolean
  bytes: number
  estimatedBase64Bytes: number
  message: string
}

/** 解析后的 Base64 输入 */
export type ParsedImageBase64 = {
  mime: string
  base64: string
  dataUrl: string
  estimatedBinaryBytes: number
}

/**
 * 估算二进制转 Base64 后的近似字节数（约 +33%）
 * @param binaryBytes 原始字节
 * @returns 估算体积
 */
export function EstimateBase64Bytes(binaryBytes: number): number {
  return Math.ceil(binaryBytes * (4 / 3))
}

/**
 * 估算 Base64 文本对应的原始二进制体积
 * @param base64Length 纯 Base64 字符长度（不含 data URL 头）
 * @returns 估算字节
 */
export function EstimateBinaryBytesFromBase64(base64Length: number): number {
  return Math.floor((base64Length * 3) / 4)
}

/**
 * 检查图片体积是否适合转 Base64
 * @param bytes 文件字节数
 * @returns 检查结果
 */
export function CheckImageBase64Limit(bytes: number): ImageBase64LimitResult {
  const estimatedBase64Bytes = EstimateBase64Bytes(bytes)
  if (bytes > IMAGE_BASE64_MAX_BYTES) {
    return {
      level: 'block',
      allowed: false,
      bytes,
      estimatedBase64Bytes,
      message: `图片过大（${FormatFileSize(bytes)}），已超过上限 ${FormatFileSize(IMAGE_BASE64_MAX_BYTES)}。超大图片不建议转 Base64，请先压缩后再试。`,
    }
  }
  if (bytes > IMAGE_BASE64_WARN_BYTES) {
    return {
      level: 'warn',
      allowed: true,
      bytes,
      estimatedBase64Bytes,
      message: `当前图片约 ${FormatFileSize(bytes)}，转 Base64 后约 ${FormatFileSize(estimatedBase64Bytes)}（体积约 +33%）。几 MB 以上易导致页面卡顿或复制崩溃，建议压缩后再转。`,
    }
  }
  return {
    level: 'ok',
    allowed: true,
    bytes,
    estimatedBase64Bytes,
    message: `原图 ${FormatFileSize(bytes)}，预估 Base64 约 ${FormatFileSize(estimatedBase64Bytes)}（约 +33%）。`,
  }
}

/**
 * 检查 Base64 文本长度是否超限
 * @param textLength 文本长度（含或不含 data URL 头）
 * @param estimatedBinaryBytes 估算二进制体积
 * @returns 检查结果
 */
export function CheckBase64TextLimit(
  textLength: number,
  estimatedBinaryBytes: number
): ImageBase64LimitResult {
  const estimatedBase64Bytes = textLength
  if (textLength > IMAGE_BASE64_MAX_CHARS || estimatedBinaryBytes > IMAGE_BASE64_MAX_BYTES) {
    return {
      level: 'block',
      allowed: false,
      bytes: estimatedBinaryBytes,
      estimatedBase64Bytes,
      message: `Base64 文本过长（约 ${FormatFileSize(textLength)} 字符量级），对应图片约 ${FormatFileSize(estimatedBinaryBytes)}，已超过上限 ${FormatFileSize(IMAGE_BASE64_MAX_BYTES)}。超长字符串容易造成页面卡顿、复制崩溃。`,
    }
  }
  if (estimatedBinaryBytes > IMAGE_BASE64_WARN_BYTES) {
    return {
      level: 'warn',
      allowed: true,
      bytes: estimatedBinaryBytes,
      estimatedBase64Bytes,
      message: `该 Base64 对应图片约 ${FormatFileSize(estimatedBinaryBytes)}。几 MB 以上字符串较长，粘贴与预览可能较慢。`,
    }
  }
  return {
    level: 'ok',
    allowed: true,
    bytes: estimatedBinaryBytes,
    estimatedBase64Bytes,
    message: `预估解码后约 ${FormatFileSize(estimatedBinaryBytes)}。`,
  }
}

/**
 * 读取文件为 Data URL
 * @param file 图片文件
 * @returns Data URL
 */
export function ReadFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('读取图片失败'))
    }
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 从 Data URL 中拆出纯 Base64 段
 * @param dataUrl Data URL
 * @returns 纯 Base64；无法拆分则原样返回
 */
export function ExtractBase64Payload(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) {
    return dataUrl.trim()
  }
  return dataUrl.slice(comma + 1).trim()
}

/**
 * 规范化用户粘贴的 Base64 / Data URL
 * @param raw 原始文本
 * @returns 解析结果；失败返回 null
 */
export function ParseImageBase64Input(raw: string): ParsedImageBase64 | null {
  const text = raw.trim().replace(/\s+/g, '')
  if (!text) {
    return null
  }

  let mime = 'image/png'
  let base64 = text

  const dataUrlMatch = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(text)
  if (dataUrlMatch) {
    mime = dataUrlMatch[1].toLowerCase()
    base64 = dataUrlMatch[2]
  } else if (/^data:/i.test(text)) {
    return null
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(base64) || base64.length < 8) {
    return null
  }

  const estimatedBinaryBytes = EstimateBinaryBytesFromBase64(base64.length)
  return {
    mime,
    base64,
    dataUrl: `data:${mime};base64,${base64}`,
    estimatedBinaryBytes,
  }
}

/**
 * 将 Base64 Data URL 转为 Blob
 * @param dataUrl Data URL
 * @returns Blob
 */
export function DataUrlToBlob(dataUrl: string): Blob {
  const parsed = ParseImageBase64Input(dataUrl)
  if (!parsed) {
    throw new Error('无效的 Base64 图片数据')
  }
  const binary = atob(parsed.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: parsed.mime })
}

/**
 * 根据 MIME 推断下载扩展名
 * @param mime MIME 类型
 * @returns 扩展名
 */
export function ResolveImageExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  }
  return map[mime.toLowerCase()] || 'png'
}

/**
 * 触发 Blob 下载
 * @param blob 文件内容
 * @param filename 文件名
 */
export function TriggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 格式化体积文案（复用压缩工具）
 * @param bytes 字节
 * @returns 可读体积
 */
export function FormatImageBase64Size(bytes: number): string {
  return FormatFileSize(bytes)
}

/**
 * 获取工具页常驻提示文案
 * @returns 提示列表
 */
export function GetImageBase64Notices(): string[] {
  return [
    '超大图片不建议转 Base64。',
    'Base64 体积比原二进制大约 33%。',
    `几 MB 以上图片会生成超长字符串，容易造成页面卡顿、复制崩溃；本工具限制单张不超过 ${FormatFileSize(IMAGE_BASE64_MAX_BYTES)}（超过 ${FormatFileSize(IMAGE_BASE64_WARN_BYTES)} 会提示警告）。`,
  ]
}
