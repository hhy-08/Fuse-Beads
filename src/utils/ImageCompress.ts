/**
 * 图片压缩工具模块
 * 参考 toolbox image-compressor：多格式压缩、GIF 处理、尺寸计算
 */

import imageCompression from 'browser-image-compression'
import { parseGIF, decompressFrames } from 'gifuct-js'

/** 压缩选项 */
export type CompressOptions = {
  /** 压缩质量 0~100 */
  quality: number
  /** 缩放比例 1~100，100 为原始大小 */
  scale: number
  /** 最大宽度，0 表示不限制 */
  maxWidth: number
  /** 最大高度，0 表示不限制 */
  maxHeight: number
}

/** 目标尺寸结果 */
export type TargetSize = {
  width: number
  height: number
  scaleRatio: number
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 可读字符串
 */
export function FormatFileSize(bytes: number): string {
  if (!bytes) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  )
  return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`
}

/**
 * 判断是否为 GIF
 * @param file 文件
 * @returns 是否 GIF
 */
export function IsGif(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
}

/**
 * 生成上传项唯一 ID
 * @returns uid
 */
export function CreateUploadUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 读取图片原始宽高
 * @param file 图片文件
 * @returns 宽高
 */
export function ReadImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      URL.revokeObjectURL(url)
      resolve({ width, height })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片尺寸读取失败'))
    }
    image.src = url
  })
}

/**
 * 按缩放比例与最大宽高计算目标尺寸
 * @param originalWidth 原宽
 * @param originalHeight 原高
 * @param options 压缩选项
 * @returns 目标宽高与相对原图缩放比
 */
export function ResolveTargetSize(
  originalWidth: number,
  originalHeight: number,
  options: CompressOptions,
): TargetSize {
  const scaleRatio = Math.max(1, Math.min(100, options.scale)) / 100
  let scaledWidth = Math.max(1, Math.round(originalWidth * scaleRatio))
  let scaledHeight = Math.max(1, Math.round(originalHeight * scaleRatio))

  const targetWidth = options.maxWidth > 0 ? options.maxWidth : scaledWidth
  const targetHeight = options.maxHeight > 0 ? options.maxHeight : scaledHeight
  const widthRatio = targetWidth / scaledWidth
  const heightRatio = targetHeight / scaledHeight
  const maxDimensionScale = Math.min(1, widthRatio, heightRatio)

  const width = Math.max(1, Math.round(scaledWidth * maxDimensionScale))
  const height = Math.max(1, Math.round(scaledHeight * maxDimensionScale))

  return {
    width,
    height,
    scaleRatio: Math.round((width / originalWidth) * 100),
  }
}

/**
 * 将进度值规范为 0~100
 * @param progress 原始进度（可能是 0~1 或 0~100）
 * @returns 百分比整数
 */
export function NormalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0
  }
  const percent = progress <= 1 ? progress * 100 : progress
  return Math.min(100, Math.max(0, Math.round(percent)))
}

/**
 * 压缩 GIF（按帧绘制后导出）
 * @param file GIF 文件
 * @param options 压缩选项
 * @param onProgress 进度回调 0~100
 * @returns 压缩后 Blob
 */
export function CompressGif(
  file: File,
  options: CompressOptions,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const gif = parseGIF(arrayBuffer)
        const frames = decompressFrames(gif, true)
        const originalWidth = gif.lsd.width
        const originalHeight = gif.lsd.height
        const target = ResolveTargetSize(originalWidth, originalHeight, options)

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 不可用'))
          return
        }

        canvas.width = target.width
        canvas.height = target.height

        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) {
          reject(new Error('临时 Canvas 不可用'))
          return
        }
        tempCanvas.width = target.width
        tempCanvas.height = target.height

        const scaleX = target.width / originalWidth
        const scaleY = target.height / originalHeight
        let firstFrameDataUrl = ''

        for (let i = 0; i < frames.length; i += 1) {
          const frame = frames[i]
          onProgress?.(NormalizeProgress(((i + 1) / frames.length) * 100))

          const frameCanvas = document.createElement('canvas')
          frameCanvas.width = frame.dims.width
          frameCanvas.height = frame.dims.height
          const frameCtx = frameCanvas.getContext('2d')
          if (!frameCtx) {
            continue
          }
          frameCtx.putImageData(
            new ImageData(frame.patch, frame.dims.width, frame.dims.height),
            0,
            0,
          )

          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
          tempCtx.drawImage(
            frameCanvas,
            frame.dims.left * scaleX,
            frame.dims.top * scaleY,
            frame.dims.width * scaleX,
            frame.dims.height * scaleY,
          )
          ctx.drawImage(tempCanvas, 0, 0)

          if (!firstFrameDataUrl) {
            firstFrameDataUrl = canvas.toDataURL('image/png')
          }
        }

        const blob = await new Promise<Blob | null>((blobResolve) => {
          if (!firstFrameDataUrl) {
            canvas.toBlob(blobResolve, 'image/gif', options.quality / 100)
            return
          }
          const image = new Image()
          image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blobResolve, 'image/gif', options.quality / 100)
          }
          image.onerror = () => {
            canvas.toBlob(blobResolve, 'image/gif', options.quality / 100)
          }
          image.src = firstFrameDataUrl
        })

        if (!blob) {
          reject(new Error('GIF 压缩失败'))
          return
        }
        resolve(blob)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('GIF 读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 压缩普通图片（JPG/PNG/WebP 等）
 * @param file 图片文件
 * @param options 压缩选项
 * @param target 目标尺寸
 * @param onProgress 进度回调 0~100
 * @returns 压缩后文件
 */
export async function CompressStillImage(
  file: File,
  options: CompressOptions,
  target: TargetSize,
  onProgress?: (progress: number) => void,
): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: Math.max(target.width, target.height),
    useWebWorker: true,
    alwaysKeepResolution: false,
    initialQuality: options.quality / 100,
    onProgress: (progress) => {
      onProgress?.(NormalizeProgress(progress))
    },
  })
}

/**
 * 按文件类型执行压缩
 * @param file 原始文件
 * @param options 压缩选项
 * @param onProgress 进度回调
 * @returns 压缩结果元数据
 */
export async function CompressImageFile(
  file: File,
  options: CompressOptions,
  onProgress?: (progress: number) => void,
): Promise<{
  blob: Blob
  compressedWidth: number
  compressedHeight: number
  scaleRatio: number
  isGif: boolean
}> {
  const original = await ReadImageDimensions(file)
  const target = ResolveTargetSize(original.width, original.height, options)
  const isGif = IsGif(file)

  let blob: Blob
  if (isGif) {
    blob = await CompressGif(file, options, onProgress)
  } else {
    blob = await CompressStillImage(file, options, target, onProgress)
  }

  return {
    blob,
    compressedWidth: target.width,
    compressedHeight: target.height,
    scaleRatio: target.scaleRatio,
    isGif,
  }
}
