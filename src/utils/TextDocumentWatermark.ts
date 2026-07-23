/**
 * 文本文档 → 预览图（供水印工具复用图片水印流程）
 * 支持 txt / md / csv / json / html / docx（.doc 不支持，请转 docx）
 */
import mammoth from 'mammoth'
import type { WatermarkImageItem } from '@/views/watermark/types'

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const PAGE_PADDING = 48
const BODY_FONT_SIZE = 16
const LINE_HEIGHT = 26
const MAX_PAGES = 40

/**
 * 判断是否为可加水印的文本文档
 * @param file 文件
 * @returns 是否支持
 */
export function IsWatermarkDocumentFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.doc') && !name.endsWith('.docx')) {
    return false
  }
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.html') ||
    name.endsWith('.htm') ||
    name.endsWith('.docx')
  ) {
    return true
  }
  const type = file.type
  return (
    type === 'text/plain' ||
    type === 'text/markdown' ||
    type === 'text/csv' ||
    type === 'application/json' ||
    type === 'text/html' ||
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

/**
 * 是否为旧版 Word（.doc）
 * @param file 文件
 * @returns boolean
 */
export function IsLegacyDocFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.doc') && !name.endsWith('.docx')
}

/**
 * 从文件提取纯文本
 * @param file 文件
 * @returns 文本内容
 */
export async function ExtractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return (result.value || '').trim()
  }
  if (name.endsWith('.html') || name.endsWith('.htm') || file.type === 'text/html') {
    const html = await file.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body?.innerText || '').trim()
  }
  return (await file.text()).trim()
}

/**
 * 按宽度换行
 * @param ctx 画布上下文
 * @param text 原文
 * @param maxWidth 最大行宽
 * @returns 行数组
 */
function WrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('')
      return
    }
    let current = ''
    for (const char of paragraph) {
      const next = current + char
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current)
        current = char
      } else {
        current = next
      }
    }
    if (current) {
      lines.push(current)
    }
  })

  return lines.length ? lines : ['']
}

/**
 * 将单页文字绘制为图片并生成水印列表项
 * @param file 源文件
 * @param lines 本页行
 * @param pageIndex 页码（从 0）
 * @param pageCount 总页数
 * @returns 列表项
 */
function BuildPageItem(
  file: File,
  lines: string[],
  pageIndex: number,
  pageCount: number,
): Promise<WatermarkImageItem> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = PAGE_WIDTH
    canvas.height = PAGE_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 不可用'))
      return
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    ctx.fillStyle = '#1f2a3d'
    ctx.font = `${BODY_FONT_SIZE}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textBaseline = 'top'

    let y = PAGE_PADDING
    lines.forEach((line) => {
      ctx.fillText(line, PAGE_PADDING, y)
      y += LINE_HEIGHT
    })

    ctx.fillStyle = '#9aa6b8'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      `${pageIndex + 1} / ${pageCount}`,
      PAGE_WIDTH - PAGE_PADDING - 48,
      PAGE_HEIGHT - 28,
    )

    const url = canvas.toDataURL('image/png')
    const image = new Image()
    image.onload = () => {
      const base = file.name
      const displayName =
        pageCount > 1 ? `${base}（第 ${pageIndex + 1} 页）` : base
      resolve({
        file,
        displayName,
        kind: 'document',
        url,
        image,
        status: 'pending',
        processedData: '',
      })
    }
    image.onerror = () => reject(new Error('文本页预览生成失败'))
    image.src = url
  })
}

/**
 * 将文本文档排版为多页预览图（A4）
 * @param file 源文件
 * @param text 文本
 * @returns 水印列表项（每页一项）
 */
export async function RenderDocumentToWatermarkItems(
  file: File,
  text: string,
): Promise<WatermarkImageItem[]> {
  const content = text.trim() || '（空文档）'
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) {
    throw new Error('Canvas 不可用')
  }
  measureCtx.font = `${BODY_FONT_SIZE}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
  const maxWidth = PAGE_WIDTH - PAGE_PADDING * 2
  const allLines = WrapTextLines(measureCtx, content, maxWidth)
  const linesPerPage = Math.max(
    1,
    Math.floor((PAGE_HEIGHT - PAGE_PADDING * 2 - 20) / LINE_HEIGHT),
  )

  const pages: string[][] = []
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage))
    if (pages.length >= MAX_PAGES) {
      break
    }
  }
  if (!pages.length) {
    pages.push([''])
  }

  const items: WatermarkImageItem[] = []
  for (let i = 0; i < pages.length; i += 1) {
    items.push(await BuildPageItem(file, pages[i], i, pages.length))
  }
  return items
}

/**
 * 加载文本文档为水印列表项
 * @param file 文件
 * @returns 列表项
 */
export async function LoadDocumentAsWatermarkItems(
  file: File,
): Promise<WatermarkImageItem[]> {
  if (IsLegacyDocFile(file)) {
    throw new Error(`暂不支持旧版 .doc：${file.name}，请另存为 .docx 后上传`)
  }
  if (!IsWatermarkDocumentFile(file)) {
    throw new Error(`不支持的文件类型：${file.name}`)
  }
  const text = await ExtractDocumentText(file)
  return RenderDocumentToWatermarkItems(file, text)
}
