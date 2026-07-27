/**
 * 图片转 SVG 工具模块
 * 支持：嵌入保真、Potrace（esm-potrace-wasm）、ImageTracer 彩色描摹
 */
import { init as InitPotrace, potrace as RunPotrace } from 'esm-potrace-wasm'
import ImageTracer from 'imagetracerjs'

/** 图片 → SVG 方式 */
export type ImageToSvgMethod = 'embed' | 'potrace' | 'imagetracer'

/** ImageTracer 描摹预设 */
export type TracePresetId =
  | 'smooth'
  | 'detailed'
  | 'posterized1'
  | 'posterized2'
  | 'posterized3'
  | 'grayscale'
  | 'sharp'

/** 转换参数 */
export type ImageToSvgOptions = {
  file: File
  method: ImageToSvgMethod
  /** 描摹最大边长，过大则先缩小再描摹 */
  maxSide?: number
  /** 描摹最小边长，过小则先放大再描摹（避免圆变折线） */
  minSide?: number
  /** ImageTracer 颜色数 */
  numberOfColors?: number
  /** ImageTracer 预设 */
  tracePreset?: TracePresetId
  /** Potrace：是否提取多色 */
  extractColors?: boolean
  /** Potrace：海报化层数 1–16 */
  posterizeLevel?: number
  /** Potrace：噪点过滤 turdsize */
  turdSize?: number
  /** Potrace：单色填充色（关闭提取颜色时） */
  fillColor?: string
}

/** 转换结果 */
export type ImageToSvgResult = {
  svgText: string
  fileName: string
  width: number
  height: number
  blob: Blob
  previewUrl: string
}

/** 接受的位图类型 */
export const IMAGETOSVGACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'

/** 描摹边长上限 */
export const IMAGETOTRACEMAXSIDE = 1280

/** 描摹边长下限：过小图标先放大，边缘采样更密 */
export const IMAGETOTRACEMINSIDE = 640

/** 转换方式选项 */
const METHODOPTIONS: { id: ImageToSvgMethod; label: string }[] = [
  { id: 'potrace', label: 'Potrace 轮廓（推荐，曲线更平滑）' },
  { id: 'imagetracer', label: 'ImageTracer 彩色描摹' },
  { id: 'embed', label: '嵌入保真（位图嵌入，非矢量）' },
]

/**
 * 平滑优先的 ImageTracer 基准参数
 */
const SMOOTHTRACEBASE: Record<string, unknown> = {
  corsenabled: false,
  ltres: 0.02,
  qtres: 0.02,
  pathomit: 0,
  rightangleenhance: false,
  colorsampling: 2,
  numberofcolors: 16,
  mincolorratio: 0,
  colorquantcycles: 3,
  layering: 0,
  strokewidth: 0,
  linefilter: true,
  scale: 1,
  roundcoords: 2,
  viewbox: true,
  desc: false,
  lcpr: 0,
  qcpr: 0,
  blurradius: 1,
  blurdelta: 32,
}

/** ImageTracer 各预设覆盖项 */
const TRACEPRESETOVERRIDES: Record<TracePresetId, Record<string, unknown>> = {
  smooth: {},
  detailed: {
    ltres: 0.01,
    qtres: 0.01,
    blurradius: 0,
    numberofcolors: 32,
  },
  posterized1: {
    ...(ImageTracer.optionpresets?.posterized1 || {}),
    ltres: 0.05,
    qtres: 0.05,
    rightangleenhance: false,
    strokewidth: 0,
    roundcoords: 2,
  },
  posterized2: {
    ...(ImageTracer.optionpresets?.posterized2 || {}),
    ltres: 0.05,
    qtres: 0.05,
    rightangleenhance: false,
    strokewidth: 0,
    roundcoords: 2,
  },
  posterized3: {
    ...(ImageTracer.optionpresets?.posterized3 || {}),
    ltres: 0.05,
    qtres: 0.05,
    rightangleenhance: false,
    strokewidth: 0,
    roundcoords: 2,
  },
  grayscale: {
    ...(ImageTracer.optionpresets?.grayscale || {}),
    ltres: 0.02,
    qtres: 0.02,
    rightangleenhance: false,
    strokewidth: 0,
    roundcoords: 2,
  },
  sharp: {
    ltres: 0.2,
    qtres: 0.01,
    linefilter: false,
    blurradius: 0,
    rightangleenhance: true,
  },
}

const TRACEPRESETS: { id: TracePresetId; label: string }[] = [
  { id: 'smooth', label: '平滑（推荐）' },
  { id: 'detailed', label: '细节' },
  { id: 'posterized1', label: '海报 1' },
  { id: 'posterized2', label: '海报 2' },
  { id: 'posterized3', label: '海报 3' },
  { id: 'grayscale', label: '灰度' },
  { id: 'sharp', label: '锐利折线' },
]

let potraceReady: Promise<void> | null = null

/**
 * 获取转换方式列表
 * @returns 选项
 */
export function GetImageToSvgMethods(): {
  id: ImageToSvgMethod
  label: string
}[] {
  return METHODOPTIONS
}

/**
 * 获取 ImageTracer 描摹预设列表
 * @returns 预设
 */
export function GetTracePresets(): { id: TracePresetId; label: string }[] {
  return TRACEPRESETS
}

/**
 * 判断是否为可转 SVG 的位图
 * @param file 文件
 * @returns 是否支持
 */
export function IsRasterImageFile(file: File): boolean {
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    return true
  }
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name)
}

/**
 * 方式展示名
 * @param method 方式
 * @returns 文案
 */
export function GetMethodLabel(method: ImageToSvgMethod): string {
  if (method === 'embed') {
    return '嵌入'
  }
  if (method === 'potrace') {
    return 'Potrace'
  }
  return 'ImageTracer'
}

/**
 * 初始化 Potrace WASM（懒加载，只初始化一次）
 * @returns Promise
 */
async function EnsurePotraceReady(): Promise<void> {
  if (!potraceReady) {
    potraceReady = InitPotrace()
  }
  await potraceReady
}

/**
 * 读取图片为 HTMLImageElement
 * @param source ObjectURL
 * @returns 图片
 */
function LoadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = source
  })
}

/**
 * 计算描摹用画布尺寸：过小放大、过大缩小
 * @param naturalW 原始宽
 * @param naturalH 原始高
 * @param maxSide 长边上限
 * @param minSide 长边下限
 * @returns 目标宽高
 */
function ResolveTraceSize(
  naturalW: number,
  naturalH: number,
  maxSide: number,
  minSide: number,
): { width: number; height: number } {
  const longSide = Math.max(naturalW, naturalH)
  let scale = 1
  if (maxSide > 0 && longSide > maxSide) {
    scale = maxSide / longSide
  } else if (minSide > 0 && longSide < minSide) {
    scale = minSide / longSide
  }
  return {
    width: Math.max(1, Math.round(naturalW * scale)),
    height: Math.max(1, Math.round(naturalH * scale)),
  }
}

/**
 * 将图片绘制到 canvas（可限制最大/最小边）
 * @param image 图片
 * @param maxSide 最大边长；0 表示不限制上限
 * @param minSide 最小边长；0 表示不放大
 * @returns canvas 与实际尺寸
 */
function DrawImageToCanvas(
  image: HTMLImageElement,
  maxSide = 0,
  minSide = 0,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const naturalW = image.naturalWidth || image.width
  const naturalH = image.naturalHeight || image.height
  if (!naturalW || !naturalH) {
    throw new Error('图片尺寸无效')
  }

  const { width, height } = ResolveTraceSize(
    naturalW,
    naturalH,
    maxSide,
    minSide,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)
  return { canvas, width, height }
}

/**
 * 生成导出文件名
 * @param sourceName 源文件名
 * @returns .svg 文件名
 */
export function BuildImageToSvgFileName(sourceName: string): string {
  const base =
    sourceName.replace(/\.[^.]+$/, '').replace(/[^\w\u4e00-\u9fa5.-]+/g, '_') ||
    'image-export'
  return `${base}.svg`
}

/**
 * 转义 XML 属性
 * @param value 原文
 * @returns 转义后
 */
function EscapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 打包 SVG 文本为可下载结果
 * @param svgText SVG
 * @param sourceName 源名
 * @param width 宽
 * @param height 高
 * @returns 结果
 */
function FinalizeSvgResult(
  svgText: string,
  sourceName: string,
  width: number,
  height: number,
): ImageToSvgResult {
  const blob = new Blob([svgText], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const previewUrl = URL.createObjectURL(blob)
  return {
    svgText,
    fileName: BuildImageToSvgFileName(sourceName),
    width,
    height,
    blob,
    previewUrl,
  }
}

/**
 * 规范化 Potrace 返回值（可能是 string 或 string[]）
 * @param result Potrace 输出
 * @returns SVG 文本
 */
function NormalizePotraceSvg(result: string | string[]): string {
  if (Array.isArray(result)) {
    const parts = result.filter((item) => typeof item === 'string' && item.trim())
    if (!parts.length) {
      throw new Error('Potrace 未生成有效路径')
    }
    if (parts.length === 1 && parts[0].includes('<svg')) {
      return parts[0]
    }
    const body = parts
      .map((chunk) => (chunk.includes('<path') ? chunk : `<g>${chunk}</g>`))
      .join('\n')
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
      body,
      `</svg>`,
    ].join('\n')
  }
  return result
}

/**
 * 将位图嵌入为 SVG（保真，非矢量路径）
 * @param file 图片文件
 * @returns 转换结果
 */
export async function ConvertImageToEmbeddedSvg(
  file: File,
): Promise<ImageToSvgResult> {
  if (!IsRasterImageFile(file)) {
    throw new Error('请上传 PNG / JPG / WebP / GIF 图片')
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await LoadImageElement(objectUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
    const svgText = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <title>${EscapeXml(file.name)}</title>`,
      `  <image width="${width}" height="${height}" href="${dataUrl}" xlink:href="${dataUrl}" />`,
      `</svg>`,
    ].join('\n')
    return FinalizeSvgResult(svgText, file.name, width, height)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 使用 Potrace 将位图描摹为矢量 SVG
 * @param file 图片文件
 * @param options 描摹参数
 * @returns 转换结果
 */
export async function ConvertImageToPotraceSvg(
  file: File,
  options: {
    maxSide?: number
    minSide?: number
    extractColors?: boolean
    posterizeLevel?: number
    turdSize?: number
    fillColor?: string
  } = {},
): Promise<ImageToSvgResult> {
  if (!IsRasterImageFile(file)) {
    throw new Error('请上传 PNG / JPG / WebP / GIF 图片')
  }
  const maxSide = options.maxSide || IMAGETOTRACEMAXSIDE
  const minSide = options.minSide ?? IMAGETOTRACEMINSIDE
  const objectUrl = URL.createObjectURL(file)
  try {
    await EnsurePotraceReady()
    const image = await LoadImageElement(objectUrl)
    const { canvas, width, height } = DrawImageToCanvas(
      image,
      maxSide,
      minSide,
    )
    const extractColors = options.extractColors !== false
    const posterizeLevel = Math.min(
      16,
      Math.max(1, Math.round(options.posterizeLevel ?? 4)),
    )
    const turdSize = Math.min(
      100,
      Math.max(0, Math.round(options.turdSize ?? 2)),
    )
    const raw = await RunPotrace(canvas, {
      turdsize: turdSize,
      turnpolicy: 4,
      alphamax: 1,
      opticurve: 1,
      opttolerance: 0.2,
      pathonly: false,
      extractcolors: extractColors,
      posterizelevel: posterizeLevel,
      posterizationalgorithm: 0,
      color: options.fillColor || '#000000',
    })
    const svgText = NormalizePotraceSvg(raw)
    if (!svgText.includes('<svg') && !svgText.includes('<path')) {
      throw new Error('Potrace 描摹失败，请换图或调整参数重试')
    }
    return FinalizeSvgResult(svgText, file.name, width, height)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 使用 ImageTracer 将位图描摹为矢量 SVG
 * @param file 图片文件
 * @param options 描摹参数
 * @returns 转换结果
 */
export async function ConvertImageToTracedSvg(
  file: File,
  options: {
    maxSide?: number
    minSide?: number
    numberOfColors?: number
    tracePreset?: TracePresetId
  } = {},
): Promise<ImageToSvgResult> {
  if (!IsRasterImageFile(file)) {
    throw new Error('请上传 PNG / JPG / WebP / GIF 图片')
  }
  const maxSide = options.maxSide || IMAGETOTRACEMAXSIDE
  const minSide = options.minSide ?? IMAGETOTRACEMINSIDE
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await LoadImageElement(objectUrl)
    const { canvas, width, height } = DrawImageToCanvas(
      image,
      maxSide,
      minSide,
    )
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('无法读取像素')
    }
    const imageData = ctx.getImageData(0, 0, width, height)
    const preset = options.tracePreset || 'smooth'
    const override = TRACEPRESETOVERRIDES[preset] || {}
    const traceOptions: Record<string, unknown> = {
      ...SMOOTHTRACEBASE,
      ...override,
      viewbox: true,
    }
    if (
      typeof options.numberOfColors === 'number' &&
      options.numberOfColors >= 2
    ) {
      traceOptions.numberofcolors = Math.min(
        64,
        Math.max(2, Math.round(options.numberOfColors)),
      )
    }
    const svgText = ImageTracer.imagedataToSVG(imageData, traceOptions)
    if (!svgText || !svgText.includes('<svg')) {
      throw new Error('描摹失败，请换图或降低复杂度重试')
    }
    return FinalizeSvgResult(svgText, file.name, width, height)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 按方式转换图片为 SVG
 * @param options 参数
 * @returns 结果
 */
export async function ConvertImageToSvg(
  options: ImageToSvgOptions,
): Promise<ImageToSvgResult> {
  if (options.method === 'embed') {
    return ConvertImageToEmbeddedSvg(options.file)
  }
  if (options.method === 'potrace') {
    return ConvertImageToPotraceSvg(options.file, {
      maxSide: options.maxSide,
      minSide: options.minSide,
      extractColors: options.extractColors,
      posterizeLevel: options.posterizeLevel,
      turdSize: options.turdSize,
      fillColor: options.fillColor,
    })
  }
  return ConvertImageToTracedSvg(options.file, {
    maxSide: options.maxSide,
    minSide: options.minSide,
    numberOfColors: options.numberOfColors,
    tracePreset: options.tracePreset,
  })
}

/**
 * 触发 SVG 文本下载
 * @param svgText SVG 文本
 * @param fileName 文件名
 */
export function TriggerSvgTextDownload(svgText: string, fileName: string): void {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`
  link.click()
  URL.revokeObjectURL(url)
}
