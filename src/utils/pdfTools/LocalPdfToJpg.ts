/**
 * PDF → JPG 本地渲染（复用 pdfjs，不上传服务器）
 */
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import JSZip from 'jszip'
import { GetBaseRoute } from '@/utils/Env'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * 解析 pdf.js 静态资源前缀
 * @returns 以 / 结尾的路径
 */
function ResolvePdfjsAssetBase(): string {
  const base = GetBaseRoute() || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}pdfjs/`
}

/**
 * 将 PDF 每页导出为 JPG，多页打包 ZIP
 * @param file PDF 文件
 * @param onProgress 进度 0~100
 * @returns 结果
 */
export async function ConvertPdfToJpgLocal(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const data = new Uint8Array(await file.arrayBuffer())
  const assetBase = ResolvePdfjsAssetBase()
  const pdf = await pdfjsLib.getDocument({
    data,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
  }).promise

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'page'
  const zip = new JSZip()
  const scale = 2

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 不可用')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({
      canvasContext: ctx,
      canvas,
      viewport,
      intent: 'display',
      annotationMode: pdfjsLib.AnnotationMode.ENABLE,
    }).promise

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('导出 JPG 失败'))),
        'image/jpeg',
        0.92,
      )
    })

    if (pdf.numPages === 1) {
      onProgress?.(100)
      return { blob, fileName: `${baseName}.jpg` }
    }
    zip.file(`${baseName}_p${pageNumber}.jpg`, blob)
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 100))
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { blob: zipBlob, fileName: `${baseName}_jpg.zip` }
}
