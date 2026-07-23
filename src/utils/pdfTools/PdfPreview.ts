/**
 * PDF 结果预览 —— 用 pdf.js 渲染指定页到 Canvas
 */
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { GetBaseRoute } from '@/utils/Env'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export type PdfPreviewDoc = {
  pageCount: number
  /** 内部文档代理，调用方负责销毁 */
  destroy: () => Promise<void>
  RenderPage: (pageNumber: number, canvas: HTMLCanvasElement, scale?: number) => Promise<void>
}

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
 * 判断 Blob / 文件名是否为 PDF
 * @param blob 结果
 * @param fileName 文件名
 * @returns 是否 PDF
 */
export function IsPdfResult(blob: Blob, fileName: string): boolean {
  if (blob.type === 'application/pdf') return true
  return /\.pdf$/i.test(fileName)
}

/**
 * 打开 PDF Blob 供预览
 * @param blob PDF 数据
 * @returns 预览文档句柄
 */
export async function OpenPdfPreview(blob: Blob): Promise<PdfPreviewDoc> {
  const data = new Uint8Array(await blob.arrayBuffer())
  const assetBase = ResolvePdfjsAssetBase()
  const pdf = await pdfjsLib.getDocument({
    data,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
  }).promise

  return {
    pageCount: pdf.numPages,
    /**
     * 销毁文档释放内存
     */
    destroy: async () => {
      await pdf.cleanup()
    },
    /**
     * 渲染某一页到 canvas
     * @param pageNumber 页码（从 1 起）
     * @param canvas 目标画布
     * @param scale 缩放
     */
    RenderPage: async (pageNumber, canvas, scale = 1.25) => {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale })
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
    },
  }
}
