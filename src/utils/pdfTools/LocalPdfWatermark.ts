/**
 * PDF 文字水印（浏览器本地）
 * 用 pdf.js 渲染页面 + Canvas 绘制水印（支持中文系统字体）+ jsPDF 合成
 */
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { jsPDF } from 'jspdf'
import { GetBaseRoute } from '@/utils/Env'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export type PdfWatermarkPositionId =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'middleLeft'
  | 'center'
  | 'middleRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'

export type PdfWatermarkOptions = {
  text: string
  color: string
  fontSize: number
  /** 0~100 */
  opacity: number
  /** -180~180 */
  rotation: number
  position: PdfWatermarkPositionId
  isTiled: boolean
  tileSpacingX: number
  tileSpacingY: number
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
 * 解析颜色与透明度
 * @param hex #rrggbb
 * @param opacityPercent 0~100
 * @returns rgba 分量
 */
function ParseColor(hex: string, opacityPercent: number) {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const red = parseInt(full.slice(0, 2), 16) || 0
  const green = parseInt(full.slice(2, 4), 16) || 0
  const blue = parseInt(full.slice(4, 6), 16) || 0
  const alpha = Math.min(1, Math.max(0.05, opacityPercent / 100))
  return { red, green, blue, alpha }
}

/**
 * 九宫格位置（Canvas：原点左上，y 向下）
 * @param width 画布宽
 * @param height 画布高
 * @param textWidth 文字宽
 * @param fontSize 字号
 * @param position 位置
 * @returns 基线坐标
 */
function ResolvePresetPoint(
  width: number,
  height: number,
  textWidth: number,
  fontSize: number,
  position: PdfWatermarkPositionId,
): { x: number; y: number } {
  const margin = Math.max(16, fontSize * 0.5)
  const baseline = fontSize * 0.8
  const map: Record<PdfWatermarkPositionId, { x: number; y: number }> = {
    topLeft: { x: margin, y: margin + baseline },
    topCenter: { x: (width - textWidth) / 2, y: margin + baseline },
    topRight: { x: width - margin - textWidth, y: margin + baseline },
    middleLeft: { x: margin, y: height / 2 + baseline / 2 },
    center: { x: (width - textWidth) / 2, y: height / 2 + baseline / 2 },
    middleRight: { x: width - margin - textWidth, y: height / 2 + baseline / 2 },
    bottomLeft: { x: margin, y: height - margin },
    bottomCenter: { x: (width - textWidth) / 2, y: height - margin },
    bottomRight: { x: width - margin - textWidth, y: height - margin },
  }
  return map[position] || map.center
}

/**
 * 绘制旋转文字（绕中心）
 * @param ctx 上下文
 * @param text 文案
 * @param x 基线 x
 * @param y 基线 y
 * @param fontSize 字号
 * @param rotation 角度
 */
function DrawRotatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  rotation: number,
) {
  const metrics = ctx.measureText(text)
  ctx.save()
  ctx.translate(x + metrics.width / 2, y - fontSize / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-(x + metrics.width / 2), -(y - fontSize / 2))
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
  ctx.restore()
}

/**
 * 在已渲染的页面画布上叠加水印
 * @param ctx 上下文
 * @param canvas 画布
 * @param options 水印参数（字号已按渲染倍率缩放）
 */
function DrawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  options: PdfWatermarkOptions,
) {
  const text = options.text.trim()
  if (!text) return

  const { red, green, blue, alpha } = ParseColor(options.color, options.opacity)
  ctx.font = `${options.fontSize}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`
  ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
  ctx.strokeStyle = `rgba(${255 - red}, ${255 - green}, ${255 - blue}, ${alpha * 0.35})`
  ctx.lineWidth = Math.max(1, options.fontSize / 15)

  const textWidth = ctx.measureText(text).width

  if (options.isTiled) {
    const tileWidth = Math.max(1, textWidth + options.tileSpacingX)
    const tileHeight = Math.max(1, options.fontSize + options.tileSpacingY)
    const origin = ResolvePresetPoint(
      canvas.width,
      canvas.height,
      textWidth,
      options.fontSize,
      options.position,
    )
    const startX = ((origin.x % tileWidth) + tileWidth) % tileWidth - tileWidth
    const startY = ((origin.y % tileHeight) + tileHeight) % tileHeight - tileHeight
    const cols = Math.ceil((canvas.width - startX) / tileWidth) + 1
    const rows = Math.ceil((canvas.height - startY) / tileHeight) + 1

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * tileWidth
        const y = startY + options.fontSize * 0.8 + row * tileHeight
        DrawRotatedText(ctx, text, x, y, options.fontSize, options.rotation)
      }
    }
    return
  }

  const point = ResolvePresetPoint(
    canvas.width,
    canvas.height,
    textWidth,
    options.fontSize,
    options.position,
  )
  DrawRotatedText(ctx, text, point.x, point.y, options.fontSize, options.rotation)
}

/**
 * 本地为 PDF 添加文字水印（支持中文）
 * @param file PDF 文件
 * @param options 水印参数
 * @param onProgress 进度回调
 * @returns 结果
 */
export async function WatermarkPdfLocal(
  file: File,
  options: PdfWatermarkOptions,
  onProgress?: (percent: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  if (!options.text.trim()) {
    throw new Error('水印文字不能为空')
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const assetBase = ResolvePdfjsAssetBase()
  const pdf = await pdfjsLib.getDocument({
    data,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
  }).promise

  const scale = 2
  const scaledOptions: PdfWatermarkOptions = {
    ...options,
    fontSize: Math.max(8, options.fontSize * scale),
    tileSpacingX: options.tileSpacingX * scale,
    tileSpacingY: options.tileSpacingY * scale,
  }

  let doc: jsPDF | null = null
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'watermarked'

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

    DrawWatermarkOnCanvas(ctx, canvas, scaledOptions)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const pageWidth = canvas.width
    const pageHeight = canvas.height

    if (!doc) {
      doc = new jsPDF({
        orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageWidth, pageHeight],
        compress: true,
      })
    } else {
      doc.addPage([pageWidth, pageHeight], pageWidth >= pageHeight ? 'landscape' : 'portrait')
    }
    doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight)

    onProgress?.(Math.round((pageNumber / pdf.numPages) * 100))
  }

  if (!doc) {
    throw new Error('PDF 无有效页面')
  }

  const output = doc.output('blob')
  return {
    blob: output,
    fileName: `${baseName}_watermarked.pdf`,
  }
}
