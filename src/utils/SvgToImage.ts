/**
 * SVG 转图片工具模块
 * 将 SVG 文本/文件渲染到 Canvas，导出 PNG / JPEG / WebP
 */

/** 输出格式 */
export type SvgOutputFormat = 'png' | 'jpeg' | 'webp'

/** 尺寸信息 */
export type SvgSizeInfo = {
  width: number
  height: number
}

/** 转换参数 */
export type SvgConvertOptions = {
  svgText: string
  width: number
  height: number
  format: SvgOutputFormat
  quality?: number
  /** JPEG 背景色，默认白 */
  backgroundColor?: string
  fileName?: string
}

/** 转换结果 */
export type SvgConvertResult = {
  blob: Blob
  fileName: string
  dataUrl: string
  width: number
  height: number
}

/** 格式选项 */
export type SvgFormatOption = {
  value: SvgOutputFormat
  label: string
  mime: string
  extension: string
  supportsQuality: boolean
}

const FORMATOPTIONS: SvgFormatOption[] = [
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

/** 默认输出边长上限，避免超大画布卡死 */
export const SVGTOIMAGEMAXSIDE = 8192

/** 上传接受类型 */
export const SVGTOIMAGEACCEPT = '.svg,image/svg+xml'

/**
 * 获取输出格式列表
 * @returns 格式选项
 */
export function GetSvgOutputFormats(): SvgFormatOption[] {
  return FORMATOPTIONS
}

/**
 * 解析格式元信息
 * @param format 格式
 * @returns 元信息
 */
export function ResolveSvgFormatOption(format: SvgOutputFormat): SvgFormatOption {
  return FORMATOPTIONS.find((item) => item.value === format) || FORMATOPTIONS[0]
}

/**
 * 判断是否为 SVG 文件
 * @param file 文件
 * @returns 是否支持
 */
export function IsSvgFile(file: File): boolean {
  if (file.type === 'image/svg+xml') {
    return true
  }
  return /\.svg$/i.test(file.name)
}

/**
 * 从字符串判断是否像 SVG
 * @param text 文本
 * @returns 是否 SVG
 */
export function LooksLikeSvgText(text: string): boolean {
  const sample = text.trim().slice(0, 500).toLowerCase()
  return sample.includes('<svg') || sample.startsWith('<?xml')
}

/**
 * 读取 SVG 文件文本
 * @param file 文件
 * @returns SVG 文本
 */
export async function ReadSvgFileText(file: File): Promise<string> {
  if (!IsSvgFile(file)) {
    throw new Error('请上传 .svg 文件')
  }
  const text = await file.text()
  if (!LooksLikeSvgText(text)) {
    throw new Error('文件内容不是有效的 SVG')
  }
  return text.replace(/^\uFEFF/, '')
}

/**
 * 从 URL 拉取 SVG 文本（需目标站允许 CORS）
 * @param url 地址
 * @returns SVG 文本
 */
export async function FetchSvgTextFromUrl(url: string): Promise<string> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error('请输入 SVG 链接')
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('链接格式无效')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http / https 链接')
  }

  const response = await fetch(parsed.toString(), {
    mode: 'cors',
    credentials: 'omit',
  })
  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`)
  }
  const text = await response.text()
  if (!LooksLikeSvgText(text)) {
    throw new Error('链接内容不是 SVG，请确认地址正确且允许跨域')
  }
  return text.replace(/^\uFEFF/, '')
}

/**
 * 解析长度属性（支持纯数字与 px）
 * @param value 属性值
 * @returns 像素数或 null
 */
function ParseLength(value: string | null): number | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('%')) {
    return null
  }
  const match = /^([0-9]*\.?[0-9]+)\s*(px)?$/i.exec(trimmed)
  if (!match) {
    return null
  }
  const num = Number(match[1])
  return Number.isFinite(num) && num > 0 ? num : null
}

/**
 * 解析 SVG 固有宽高（width/height 或 viewBox）
 * @param svgText SVG 文本
 * @returns 尺寸；无法解析时返回默认 512×512
 */
export function ParseSvgIntrinsicSize(svgText: string): SvgSizeInfo {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) {
    return { width: 512, height: 512 }
  }

  let width = ParseLength(svg.getAttribute('width'))
  let height = ParseLength(svg.getAttribute('height'))
  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((item) => Number(item))
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const vbWidth = Math.abs(parts[2])
      const vbHeight = Math.abs(parts[3])
      if (!width && vbWidth > 0) {
        width = vbWidth
      }
      if (!height && vbHeight > 0) {
        height = vbHeight
      }
    }
  }

  return {
    width: Math.round(width || 512),
    height: Math.round(height || 512),
  }
}

/**
 * 钳制输出边长
 * @param value 输入
 * @returns 合法边长
 */
export function ClampSvgOutputSide(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }
  return Math.min(SVGTOIMAGEMAXSIDE, Math.max(1, Math.round(value)))
}

/**
 * 生成导出文件名
 * @param sourceName 源名
 * @param format 格式
 * @returns 文件名
 */
export function BuildSvgExportFileName(
  sourceName: string,
  format: SvgOutputFormat,
): string {
  const base =
    sourceName.replace(/\.[^.]+$/, '').replace(/[^\w\u4e00-\u9fa5.-]+/g, '_') ||
    'svg-export'
  const extension = ResolveSvgFormatOption(format).extension
  return `${base}.${extension}`
}

/**
 * 加载图片元素
 * @param url 地址
 * @returns 图片
 */
function LoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('SVG 渲染失败，请检查文件内容'))
    image.src = url
  })
}

/**
 * Canvas 转 Blob
 * @param canvas 画布
 * @param mime MIME
 * @param quality 质量
 * @returns Blob
 */
function CanvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出失败'))
          return
        }
        resolve(blob)
      },
      mime,
      quality,
    )
  })
}

/**
 * Blob 转 dataURL
 * @param blob 二进制
 * @returns dataURL
 */
export function BlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('预览生成失败'))
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 SVG 文本转换为目标格式图片
 * @param options 转换参数
 * @returns 转换结果
 */
export async function ConvertSvgToImage(
  options: SvgConvertOptions,
): Promise<SvgConvertResult> {
  const width = ClampSvgOutputSide(options.width)
  const height = ClampSvgOutputSide(options.height)
  const format = options.format
  const meta = ResolveSvgFormatOption(format)
  const quality =
    typeof options.quality === 'number'
      ? Math.min(1, Math.max(0.1, options.quality))
      : 0.92

  if (!LooksLikeSvgText(options.svgText)) {
    throw new Error('SVG 内容无效')
  }

  const blobUrl = URL.createObjectURL(
    new Blob([options.svgText], { type: 'image/svg+xml;charset=utf-8' }),
  )
  try {
    const image = await LoadImage(blobUrl)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 不可用')
    }

    if (format === 'jpeg') {
      ctx.fillStyle = options.backgroundColor || '#ffffff'
      ctx.fillRect(0, 0, width, height)
    } else {
      ctx.clearRect(0, 0, width, height)
    }

    ctx.drawImage(image, 0, 0, width, height)
    const blob = await CanvasToBlob(
      canvas,
      meta.mime,
      meta.supportsQuality ? quality : undefined,
    )
    const dataUrl = await BlobToDataUrl(blob)
    return {
      blob,
      dataUrl,
      width,
      height,
      fileName: BuildSvgExportFileName(
        options.fileName || 'svg-export.svg',
        format,
      ),
    }
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

/**
 * 触发浏览器下载
 * @param blob 文件
 * @param fileName 文件名
 */
export function TriggerSvgDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
