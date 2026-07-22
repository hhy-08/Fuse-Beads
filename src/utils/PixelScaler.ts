/**
 * 像素图缩放工具模块
 * 使用最近邻插值放大/缩小，避免双线性模糊，适合拼豆素材预处理
 */

/** 缩放模式 */
export type PixelScaleMode = 'factor' | 'size'

/** 缩放参数 */
export type PixelScaleOptions = {
  mode: PixelScaleMode
  factor: number
  targetWidth: number
  targetHeight: number
  keepAspect: boolean
}

/**
 * 从 File 加载图片
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
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}

/**
 * 限制整数放大倍数
 * @param value 原始倍数
 * @returns 1~32
 */
export function ClampScaleFactor(value: number): number {
  return Math.min(32, Math.max(1, Math.round(value)))
}

/**
 * 限制目标边长
 * @param value 原始值
 * @returns 1~4096
 */
export function ClampTargetSize(value: number): number {
  return Math.min(4096, Math.max(1, Math.round(value)))
}

/**
 * 计算最近邻输出尺寸
 * @param sourceWidth 源宽
 * @param sourceHeight 源高
 * @param options 缩放参数
 * @returns 输出宽高
 */
export function ResolveScaledSize(
  sourceWidth: number,
  sourceHeight: number,
  options: PixelScaleOptions,
): { width: number; height: number } {
  if (options.mode === 'factor') {
    const factor = ClampScaleFactor(options.factor)
    return {
      width: Math.max(1, sourceWidth * factor),
      height: Math.max(1, sourceHeight * factor),
    }
  }

  let width = ClampTargetSize(options.targetWidth)
  let height = ClampTargetSize(options.targetHeight)
  if (options.keepAspect && sourceWidth > 0 && sourceHeight > 0) {
    const ratio = sourceWidth / sourceHeight
    if (width / height > ratio) {
      width = Math.max(1, Math.round(height * ratio))
    } else {
      height = Math.max(1, Math.round(width / ratio))
    }
  }
  return { width, height }
}

/**
 * 最近邻缩放：按目标宽高采样源像素
 * @param source 源画布或图片
 * @param targetWidth 目标宽
 * @param targetHeight 目标高
 * @returns 结果画布
 */
export function ScaleNearestNeighbor(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const srcWidth = 'width' in source ? source.width : 0
  const srcHeight = 'height' in source ? source.height : 0
  if (!srcWidth || !srcHeight) {
    throw new Error('源图像尺寸无效')
  }

  const outWidth = ClampTargetSize(targetWidth)
  const outHeight = ClampTargetSize(targetHeight)

  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = srcWidth
  sourceCanvas.height = srcHeight
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceCtx) {
    throw new Error('Canvas 不可用')
  }
  sourceCtx.imageSmoothingEnabled = false
  sourceCtx.drawImage(source, 0, 0)

  const srcData = sourceCtx.getImageData(0, 0, srcWidth, srcHeight)
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outWidth
  outCanvas.height = outHeight
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    throw new Error('Canvas 不可用')
  }
  const outData = outCtx.createImageData(outWidth, outHeight)

  for (let y = 0; y < outHeight; y += 1) {
    const srcY = Math.min(
      srcHeight - 1,
      Math.floor((y * srcHeight) / outHeight),
    )
    for (let x = 0; x < outWidth; x += 1) {
      const srcX = Math.min(
        srcWidth - 1,
        Math.floor((x * srcWidth) / outWidth),
      )
      const srcIndex = (srcY * srcWidth + srcX) * 4
      const outIndex = (y * outWidth + x) * 4
      outData.data[outIndex] = srcData.data[srcIndex]
      outData.data[outIndex + 1] = srcData.data[srcIndex + 1]
      outData.data[outIndex + 2] = srcData.data[srcIndex + 2]
      outData.data[outIndex + 3] = srcData.data[srcIndex + 3]
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return outCanvas
}

/**
 * 按参数缩放图片文件
 * @param file 图片文件
 * @param options 缩放参数
 * @returns 结果画布与尺寸信息
 */
export async function ScaleImageFileNearest(
  file: File,
  options: PixelScaleOptions,
): Promise<{
  canvas: HTMLCanvasElement
  sourceWidth: number
  sourceHeight: number
  width: number
  height: number
}> {
  const image = await LoadImageFromFile(file)
  const size = ResolveScaledSize(image.width, image.height, options)
  const canvas = ScaleNearestNeighbor(image, size.width, size.height)
  return {
    canvas,
    sourceWidth: image.width,
    sourceHeight: image.height,
    width: size.width,
    height: size.height,
  }
}

/**
 * 将画布导出为 PNG Blob
 * @param canvas 画布
 * @returns PNG Blob
 */
export function CanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
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
 * 触发下载
 * @param blob 文件
 * @param filename 文件名
 */
export function TriggerPixelScaleDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 生成导出文件名
 * @param originalName 原文件名
 * @param width 输出宽
 * @param height 输出高
 * @returns 文件名
 */
export function ResolveScaledFilename(
  originalName: string,
  width: number,
  height: number,
): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'pixel'
  return `${base}-nn-${width}x${height}.png`
}

/**
 * 可选整数倍快捷项
 * @returns 倍数列表
 */
export function GetScaleFactorPresets(): number[] {
  return [2, 3, 4, 6, 8, 12, 16]
}
