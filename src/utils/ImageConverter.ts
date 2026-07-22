/**
 * 图片格式转换工具模块
 * 参考 toolbox image-converter：Canvas 转码后单下或 ZIP 打包
 */

/** 支持的输出格式 */
export type ImageOutputFormat = 'jpeg' | 'png' | 'webp' | 'gif'

/** 单张转换结果 */
export type ConvertedImageResult = {
  blob: Blob
  fileName: string
}

/**
 * 生成转换后的文件名
 * @param originalName 原始文件名
 * @param format 目标格式
 * @returns 新文件名
 */
export function BuildConvertedFileName(
  originalName: string,
  format: ImageOutputFormat,
): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  const extension = format === 'jpeg' ? 'jpg' : format
  return `${base}.${extension}`
}

/**
 * 将单张图片转换为目标格式
 * @param file 原始文件
 * @param format 目标格式
 * @param quality 质量 0~1（jpeg/webp 生效）
 * @returns 转换结果
 */
export function ConvertSingleImage(
  file: File,
  format: ImageOutputFormat,
  quality = 0.92,
): Promise<ConvertedImageResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const ctx = canvas.getContext('2d')
      if (!ctx || !canvas.width || !canvas.height) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('无法创建画布'))
        return
      }

      // JPEG/GIF 不支持透明，先铺白底避免变黑
      if (format === 'jpeg' || format === 'gif') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(image, 0, 0)
      URL.revokeObjectURL(objectUrl)

      const mimeType = `image/${format}`
      const useQuality = format === 'jpeg' || format === 'webp'
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('格式转换失败'))
            return
          }
          resolve({
            blob,
            fileName: BuildConvertedFileName(file.name, format),
          })
        },
        mimeType,
        useQuality ? quality : undefined,
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`图片加载失败：${file.name}`))
    }

    image.src = objectUrl
  })
}

/**
 * 触发浏览器下载
 * @param blob 文件内容
 * @param fileName 下载文件名
 */
export function TriggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
