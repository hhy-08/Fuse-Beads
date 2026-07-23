/**
 * 图片裁剪工具模块
 * 支持自由矩形、固定比例、圆形、圆角裁切，本地 Canvas 导出 PNG
 */

/** 裁切框（原图像素坐标） */
export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

/** 图片尺寸 */
export type ImageSize = {
  width: number
  height: number
}

/** 裁切形态 */
export type CropShape = 'rect' | 'circle' | 'rounded'

/** 导出选项 */
export type ExportCropOptions = {
  image: HTMLImageElement
  crop: CropRect
  shape: CropShape
  /** 圆角半径（像素，仅 rounded） */
  radius: number
  /** 可选输出边长上限，0 表示原尺寸 */
  outputMaxSide?: number
}

/**
 * 从 File 加载图片元素（blob URL 挂在 image.src，由调用方负责 revoke）
 * @param file 图片文件
 * @returns HTMLImageElement
 */
export function LoadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
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
 * 创建居中默认裁切框（约占较短边的 80%）
 * @param imageSize 原图尺寸
 * @param aspect 宽高比（width/height），可选
 * @returns 裁切框
 */
export function CreateDefaultCropRect(
  imageSize: ImageSize,
  aspect?: number,
): CropRect {
  const { width, height } = imageSize
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let cropWidth: number
  let cropHeight: number

  if (aspect && aspect > 0) {
    const imageAspect = width / height
    if (imageAspect > aspect) {
      cropHeight = height * 0.8
      cropWidth = cropHeight * aspect
      if (cropWidth > width * 0.95) {
        cropWidth = width * 0.95
        cropHeight = cropWidth / aspect
      }
    } else {
      cropWidth = width * 0.8
      cropHeight = cropWidth / aspect
      if (cropHeight > height * 0.95) {
        cropHeight = height * 0.95
        cropWidth = cropHeight * aspect
      }
    }
  } else {
    const shortSide = Math.min(width, height)
    cropWidth = shortSide * 0.8
    cropHeight = shortSide * 0.8
  }

  return NormalizeCropRect(
    {
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    },
    imageSize,
    aspect,
  )
}

/**
 * 约束裁切框在图片内，并可选锁定宽高比
 * @param rect 原始裁切框
 * @param imageSize 原图尺寸
 * @param aspect 宽高比（width/height），可选
 * @returns 规范化后的裁切框
 */
export function NormalizeCropRect(
  rect: CropRect,
  imageSize: ImageSize,
  aspect?: number,
): CropRect {
  const { width: maxW, height: maxH } = imageSize
  if (maxW <= 0 || maxH <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let width = Math.max(1, rect.width)
  let height = Math.max(1, rect.height)

  if (aspect && aspect > 0) {
    // 以当前面积近似保持比例，优先贴合用户拖动意图
    const fromWidth = width
    const fromHeight = height
    const wByH = fromHeight * aspect
    const hByW = fromWidth / aspect
    if (Math.abs(fromWidth - wByH) < Math.abs(fromHeight - hByW)) {
      width = wByH
      height = fromHeight
    } else {
      width = fromWidth
      height = hByW
    }
  }

  width = Math.min(width, maxW)
  height = Math.min(height, maxH)

  if (aspect && aspect > 0) {
    if (width / height > aspect) {
      width = height * aspect
    } else {
      height = width / aspect
    }
    width = Math.min(width, maxW)
    height = Math.min(height, maxH)
    if (width / aspect > maxH) {
      height = maxH
      width = height * aspect
    }
    if (height * aspect > maxW) {
      width = maxW
      height = width / aspect
    }
  }

  let x = rect.x
  let y = rect.y
  x = Math.min(Math.max(0, x), maxW - width)
  y = Math.min(Math.max(0, y), maxH - height)

  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    width: Math.round(width * 1000) / 1000,
    height: Math.round(height * 1000) / 1000,
  }
}

/**
 * 按手柄类型缩放裁切框
 * @param rect 当前框
 * @param handle 手柄：n/s/e/w/ne/nw/se/sw
 * @param deltaX 水平位移（原图像素）
 * @param deltaY 垂直位移（原图像素）
 * @param imageSize 原图尺寸
 * @param aspect 锁定比例，可选
 * @returns 新裁切框
 */
export function ResizeCropRectByHandle(
  rect: CropRect,
  handle: string,
  deltaX: number,
  deltaY: number,
  imageSize: ImageSize,
  aspect?: number,
): CropRect {
  let { x, y, width, height } = rect
  const right = x + width
  const bottom = y + height

  if (handle.includes('e')) {
    width = Math.max(1, width + deltaX)
  }
  if (handle.includes('w')) {
    const nextX = x + deltaX
    width = Math.max(1, right - nextX)
    x = nextX
  }
  if (handle.includes('s')) {
    height = Math.max(1, height + deltaY)
  }
  if (handle.includes('n')) {
    const nextY = y + deltaY
    height = Math.max(1, bottom - nextY)
    y = nextY
  }

  if (aspect && aspect > 0) {
    // 角手柄：以对边锚点固定，按拖动主导轴更新
    if (handle.length === 2) {
      if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        height = width / aspect
        if (handle.includes('n')) {
          y = bottom - height
        }
      } else {
        width = height * aspect
        if (handle.includes('w')) {
          x = right - width
        }
      }
    } else if (handle === 'e' || handle === 'w') {
      height = width / aspect
      y = rect.y + (rect.height - height) / 2
    } else if (handle === 'n' || handle === 's') {
      width = height * aspect
      x = rect.x + (rect.width - width) / 2
    }
  }

  return NormalizeCropRect({ x, y, width, height }, imageSize, aspect)
}

/**
 * 移动裁切框（保持尺寸）
 * @param rect 当前框
 * @param deltaX 水平位移
 * @param deltaY 垂直位移
 * @param imageSize 原图尺寸
 * @returns 新裁切框
 */
export function MoveCropRect(
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  imageSize: ImageSize,
): CropRect {
  return NormalizeCropRect(
    {
      x: rect.x + deltaX,
      y: rect.y + deltaY,
      width: rect.width,
      height: rect.height,
    },
    imageSize,
  )
}

/**
 * 根据圆角百分比计算像素半径
 * @param crop 裁切框
 * @param percent 相对短边的百分比 0~50
 * @returns 像素半径
 */
export function GetRoundedRadius(crop: CropRect, percent: number): number {
  const shortSide = Math.min(crop.width, crop.height)
  const clamped = Math.min(50, Math.max(0, percent))
  return (shortSide * clamped) / 100
}

/**
 * 解析比例字符串为宽高比数值
 * @param ratioText 如 "16:9" 或 "1"
 * @returns width/height，无效时返回 undefined
 */
export function ParseAspectRatio(ratioText: string): number | undefined {
  const text = ratioText.trim()
  if (!text) {
    return undefined
  }
  if (text.includes(':')) {
    const [w, h] = text.split(':').map((part) => Number(part.trim()))
    if (!w || !h || w <= 0 || h <= 0) {
      return undefined
    }
    return w / h
  }
  const value = Number(text)
  if (!value || value <= 0) {
    return undefined
  }
  return value
}

/**
 * 将圆角矩形路径写入 canvas 上下文
 * @param ctx 2d 上下文
 * @param x 左
 * @param y 上
 * @param width 宽
 * @param height 高
 * @param radius 圆角半径
 */
function PathRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/**
 * 按裁切框与形态导出 PNG dataURL
 * @param options 导出选项
 * @returns PNG dataURL
 */
export function ExportCroppedImage(options: ExportCropOptions): string {
  const { image, crop, shape, radius, outputMaxSide = 0 } = options
  const srcW = Math.max(1, Math.round(crop.width))
  const srcH = Math.max(1, Math.round(crop.height))
  const srcX = Math.round(crop.x)
  const srcY = Math.round(crop.y)

  let outW = srcW
  let outH = srcH
  if (outputMaxSide && outputMaxSide > 0) {
    const scale = Math.min(1, outputMaxSide / Math.max(srcW, srcH))
    outW = Math.max(1, Math.round(srcW * scale))
    outH = Math.max(1, Math.round(srcH * scale))
  }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布')
  }

  ctx.clearRect(0, 0, outW, outH)

  if (shape === 'circle') {
    const cx = outW / 2
    const cy = outH / 2
    const r = Math.min(outW, outH) / 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  } else if (shape === 'rounded') {
    const scaledRadius = radius * (outW / srcW)
    PathRoundedRect(ctx, 0, 0, outW, outH, scaledRadius)
    ctx.clip()
  }

  ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
  return canvas.toDataURL('image/png')
}

/**
 * 触发浏览器下载 dataURL
 * @param dataUrl 数据 URL
 * @param fileName 文件名
 */
export function DownloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}
