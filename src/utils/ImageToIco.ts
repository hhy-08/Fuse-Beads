/**
 * 图片转 ICO 工具模块
 * 将图片缩放为多尺寸后，以 PNG 嵌入方式打包为标准 ICO（兼容现代系统）
 */

import { TriggerBlobDownload } from '@/utils/ImageConverter'

/** 常用 ICO 尺寸 */
export const ICO_SIZE_OPTIONS = [16, 24, 32, 48, 64, 128, 256] as const

export type IcoSize = (typeof ICO_SIZE_OPTIONS)[number]

/** 缩放适配方式 */
export type IcoFitMode = 'contain' | 'cover' | 'stretch'

/** 单张转换结果 */
export type IcoConvertResult = {
  blob: Blob
  fileName: string
  sizes: number[]
}

/**
 * 生成 ICO 文件名
 * @param originalName 原始文件名
 * @returns .ico 文件名
 */
export function BuildIcoFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'icon'
  return `${base}.ico`
}

/**
 * 将数值写入小端 Uint8 数组
 * @param view 目标视图
 * @param offset 偏移
 * @param value 数值
 * @param bytes 字节数 1/2/4
 */
function WriteUintLE(
  view: DataView,
  offset: number,
  value: number,
  bytes: 1 | 2 | 4,
) {
  if (bytes === 1) {
    view.setUint8(offset, value & 0xff)
    return
  }
  if (bytes === 2) {
    view.setUint16(offset, value & 0xffff, true)
    return
  }
  view.setUint32(offset, value >>> 0, true)
}

/**
 * Canvas 导出 PNG Blob
 * @param canvas 画布
 * @returns PNG Blob
 */
function CanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG 导出失败'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

/**
 * 按适配方式将源图画到目标尺寸画布
 * @param image 源图
 * @param size 目标边长
 * @param fit 适配方式
 * @returns 画布
 */
function DrawImageToSize(
  image: HTMLImageElement,
  size: number,
  fit: IcoFitMode,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布')
  }
  ctx.clearRect(0, 0, size, size)

  const srcW = image.naturalWidth || image.width
  const srcH = image.naturalHeight || image.height
  if (!srcW || !srcH) {
    throw new Error('图片尺寸无效')
  }

  if (fit === 'stretch') {
    ctx.drawImage(image, 0, 0, size, size)
    return canvas
  }

  const scale =
    fit === 'cover'
      ? Math.max(size / srcW, size / srcH)
      : Math.min(size / srcW, size / srcH)
  const drawW = srcW * scale
  const drawH = srcH * scale
  const dx = (size - drawW) / 2
  const dy = (size - drawH) / 2
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, dx, dy, drawW, drawH)
  return canvas
}

/**
 * 加载图片文件为 HTMLImageElement
 * @param file 图片文件
 * @returns 图片元素
 */
export function LoadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`图片加载失败：${file.name}`))
    }
    image.src = url
  })
}

/**
 * 将多份 PNG 数据打包为 ICO 文件
 * @param pngBuffers 各尺寸 PNG 字节
 * @param sizes 对应边长列表
 * @returns ICO Blob
 */
export function PackPngsToIco(
  pngBuffers: ArrayBuffer[],
  sizes: number[],
): Blob {
  if (!pngBuffers.length || pngBuffers.length !== sizes.length) {
    throw new Error('ICO 尺寸与数据数量不一致')
  }

  const count = pngBuffers.length
  const headerSize = 6
  const entrySize = 16
  const directorySize = headerSize + entrySize * count
  let offset = directorySize
  const offsets: number[] = []
  const byteLengths: number[] = []

  for (const buffer of pngBuffers) {
    offsets.push(offset)
    byteLengths.push(buffer.byteLength)
    offset += buffer.byteLength
  }

  const totalSize = offset
  const bytes = new Uint8Array(totalSize)
  const view = new DataView(bytes.buffer)

  // ICONDIR
  WriteUintLE(view, 0, 0, 2)
  WriteUintLE(view, 2, 1, 2)
  WriteUintLE(view, 4, count, 2)

  for (let i = 0; i < count; i += 1) {
    const entryOffset = headerSize + i * entrySize
    const size = sizes[i]
    const dim = size >= 256 ? 0 : size
    WriteUintLE(view, entryOffset, dim, 1)
    WriteUintLE(view, entryOffset + 1, dim, 1)
    WriteUintLE(view, entryOffset + 2, 0, 1)
    WriteUintLE(view, entryOffset + 3, 0, 1)
    WriteUintLE(view, entryOffset + 4, 1, 2)
    WriteUintLE(view, entryOffset + 6, 32, 2)
    WriteUintLE(view, entryOffset + 8, byteLengths[i], 4)
    WriteUintLE(view, entryOffset + 12, offsets[i], 4)
  }

  for (let i = 0; i < count; i += 1) {
    bytes.set(new Uint8Array(pngBuffers[i]), offsets[i])
  }

  return new Blob([bytes], { type: 'image/x-icon' })
}

/**
 * 将单张图片转为多尺寸 ICO
 * @param file 源图片
 * @param sizes 目标尺寸列表
 * @param fit 缩放适配
 * @returns 转换结果
 */
export async function ConvertImageToIco(
  file: File,
  sizes: number[],
  fit: IcoFitMode = 'contain',
): Promise<IcoConvertResult> {
  const uniqueSizes = Array.from(
    new Set(
      sizes
        .map((size) => Math.round(size))
        .filter((size) => size >= 1 && size <= 256),
    ),
  ).sort((a, b) => a - b)

  if (!uniqueSizes.length) {
    throw new Error('请至少选择一个有效尺寸')
  }

  const image = await LoadImageFromFile(file)
  const pngBuffers: ArrayBuffer[] = []

  for (const size of uniqueSizes) {
    const canvas = DrawImageToSize(image, size, fit)
    const pngBlob = await CanvasToPngBlob(canvas)
    pngBuffers.push(await pngBlob.arrayBuffer())
  }

  const blob = PackPngsToIco(pngBuffers, uniqueSizes)
  return {
    blob,
    fileName: BuildIcoFileName(file.name),
    sizes: uniqueSizes,
  }
}

/**
 * 下载 Blob（复用转换工具下载）
 * @param blob 数据
 * @param fileName 文件名
 */
export function DownloadIcoBlob(blob: Blob, fileName: string) {
  TriggerBlobDownload(blob, fileName)
}
