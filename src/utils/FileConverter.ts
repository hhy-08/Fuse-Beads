/**
 * 文件转换工具模块（纯前端）
 * 仅包含浏览器可完成的转换：PDF 渲染、文本/表格解析等
 * 不含 Word/Excel ↔ PDF 等需后端的类型
 */

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { jsPDF } from 'jspdf'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { GetBaseRoute } from '@/utils/Env'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * 解析 pdf.js 静态资源根路径（cmaps / standard_fonts）
 * @returns 以 / 结尾的资源前缀
 */
function ResolvePdfjsAssetBase(): string {
  const base = GetBaseRoute() || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}pdfjs/`
}

/**
 * 加载 PDF 文档（启用 CMap 与标准字体，修复中文发票等 CID 字体空白）
 * @param file PDF 文件
 * @returns PDF 文档代理
 */
async function LoadPdfDocument(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const assetBase = ResolvePdfjsAssetBase()
  return pdfjsLib.getDocument({
    data,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
    useSystemFonts: true,
    enableXfa: true,
    disableAutoFetch: false,
    disableStream: false,
  }).promise
}

/**
 * 将 PDF 单页渲染到 Canvas
 * @param page PDF 页
 * @param scale 缩放倍率
 * @param fillWhite 是否铺白底（JPG 必开）
 * @returns 画布
 */
async function RenderPdfPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale: number,
  fillWhite: boolean,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    throw new Error('Canvas 不可用')
  }

  if (fillWhite) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const renderTask = page.render({
    canvasContext: ctx,
    canvas,
    viewport,
    intent: 'display',
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
  })
  await renderTask.promise
  return canvas
}

/** 支持的源格式 */
export type FileSourceFormat =
  | 'pdf'
  | 'txt'
  | 'docx'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'html'

/** 支持的目标格式 */
export type FileTargetFormat =
  | 'png'
  | 'jpg'
  | 'txt'
  | 'pdf'
  | 'html'
  | 'csv'
  | 'json'

/** 转换结果 */
export type FileConvertResult = {
  blob: Blob
  fileName: string
  /** 多页图片时的附加说明 */
  tip?: string
}

/** 格式选项 */
export type FileFormatOption = {
  value: FileTargetFormat
  label: string
}

/**
 * 源格式 → 可转目标（仅纯前端可行）
 */
export const FILECONVERMAP: Record<FileSourceFormat, FileFormatOption[]> = {
  pdf: [
    { value: 'png', label: 'PNG 图片' },
    { value: 'jpg', label: 'JPG 图片' },
    { value: 'txt', label: 'TXT 文本' },
  ],
  txt: [{ value: 'pdf', label: 'PDF 文档' }],
  docx: [
    { value: 'txt', label: 'TXT 文本' },
    { value: 'html', label: 'HTML 网页' },
  ],
  xlsx: [
    { value: 'csv', label: 'CSV 表格' },
    { value: 'json', label: 'JSON 数据' },
  ],
  csv: [
    { value: 'json', label: 'JSON 数据' },
    { value: 'txt', label: 'TXT 文本' },
  ],
  json: [
    { value: 'txt', label: 'TXT 文本' },
    { value: 'csv', label: 'CSV 表格' },
  ],
  html: [{ value: 'txt', label: 'TXT 文本' }],
}

const MAXFILESIZE = 80 * 1024 * 1024

/**
 * 获取文件扩展名
 * @param fileName 文件名
 * @returns 小写扩展名
 */
export function ResolveFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  if (parts.length < 2) {
    return ''
  }
  return parts.pop()!.toLowerCase()
}

/**
 * 规范化源格式（jpeg 等不在此工具）
 * @param extension 扩展名
 * @returns 源格式或 null
 */
export function ResolveSourceFormat(
  extension: string,
): FileSourceFormat | null {
  const normalized = extension === 'htm' ? 'html' : extension
  if (normalized === 'jpeg') {
    return null
  }
  if (normalized in FILECONVERMAP) {
    return normalized as FileSourceFormat
  }
  return null
}

/**
 * 生成上传项 UID
 * @returns uid
 */
export function CreateFileUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 批量转换同格式文件
 * 单文件直接返回结果；多文件打包为 ZIP
 * @param files 文件列表（需同格式）
 * @param target 目标格式
 * @param onProgress 总进度 0~100 与当前文件名
 * @returns 转换结果
 */
export async function ConvertFilesBatch(
  files: File[],
  target: FileTargetFormat,
  onProgress?: (progress: number, currentName: string) => void,
): Promise<FileConvertResult> {
  if (!files.length) {
    throw new Error('请先选择文件')
  }

  const sourceFormats = files.map((file) =>
    ResolveSourceFormat(ResolveFileExtension(file.name)),
  )
  if (sourceFormats.some((item) => !item)) {
    throw new Error('存在不支持的源格式')
  }
  const firstSource = sourceFormats[0]
  if (sourceFormats.some((item) => item !== firstSource)) {
    throw new Error('批量转换仅支持相同格式的文件')
  }

  if (files.length === 1) {
    return ConvertFile(files[0], target, (progress) => {
      onProgress?.(progress, files[0].name)
    })
  }

  const zip = new JSZip()
  const nameSet = new Set<string>()
  let successCount = 0
  const errors: string[] = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const baseProgress = (index / files.length) * 100
    const span = 100 / files.length

    try {
      const result = await ConvertFile(file, target, (progress) => {
        onProgress?.(
          Math.min(99, Math.round(baseProgress + (progress / 100) * span)),
          file.name,
        )
      })

      let outputName = result.fileName
      if (nameSet.has(outputName)) {
        const base = outputName.replace(/\.[^.]+$/, '')
        const ext = ResolveFileExtension(outputName) || 'bin'
        outputName = `${base}_${index + 1}.${ext}`
      }
      nameSet.add(outputName)
      zip.file(outputName, result.blob)
      successCount += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : '转换失败'
      errors.push(`${file.name}：${message}`)
    }
  }

  if (!successCount) {
    throw new Error(errors[0] || '全部转换失败')
  }

  onProgress?.(100, '')
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const tipParts = [`成功 ${successCount}/${files.length} 个`]
  if (errors.length) {
    tipParts.push(`失败 ${errors.length} 个`)
  }

  return {
    blob: zipBlob,
    fileName: `converted_${firstSource}_to_${target}.zip`,
    tip: tipParts.join('，'),
  }
}

/**
 * 校验上传文件是否可转换
 * @param file 文件
 * @returns 错误信息，空表示通过
 */
export function ValidateConvertFile(file: File): string {
  if (file.size > MAXFILESIZE) {
    return '文件大小不能超过 80MB'
  }
  const extension = ResolveFileExtension(file.name)
  const source = ResolveSourceFormat(extension)
  if (!source) {
    return '暂不支持该格式。可选：PDF / TXT / DOCX / XLSX / CSV / JSON / HTML'
  }
  return ''
}

/**
 * 获取某源格式可用目标
 * @param source 源格式
 * @returns 目标选项
 */
export function ResolveAvailableTargets(
  source: FileSourceFormat,
): FileFormatOption[] {
  return FILECONVERMAP[source] || []
}

/**
 * 生成输出文件名
 * @param originalName 原名
 * @param target 目标扩展
 * @returns 新文件名
 */
export function BuildConvertedName(
  originalName: string,
  target: string,
): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'converted'
  return `${base}.${target}`
}

/**
 * 触发下载
 * @param blob 内容
 * @param fileName 文件名
 */
export function TriggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Canvas 转 Blob
 * @param canvas 画布
 * @param mimeType MIME
 * @param quality 质量
 * @returns Blob
 */
function CanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片导出失败'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

/**
 * PDF 渲染为图片（多页打包 ZIP）
 * @param file PDF 文件
 * @param imageFormat png | jpg
 * @param onProgress 进度 0~100
 * @returns 转换结果
 */
export async function ConvertPdfToImages(
  file: File,
  imageFormat: 'png' | 'jpg',
  onProgress?: (progress: number) => void,
): Promise<FileConvertResult> {
  const pdf = await LoadPdfDocument(file)
  const pageCount = pdf.numPages
  const mimeType = imageFormat === 'png' ? 'image/png' : 'image/jpeg'
  const quality = imageFormat === 'jpg' ? 0.92 : undefined
  const scale = 2.5
  const fillWhite = true
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'page'

  if (pageCount === 1) {
    onProgress?.(20)
    const page = await pdf.getPage(1)
    const canvas = await RenderPdfPageToCanvas(page, scale, fillWhite)
    onProgress?.(85)
    const blob = await CanvasToBlob(canvas, mimeType, quality)
    onProgress?.(100)
    return {
      blob,
      fileName: `${baseName}.${imageFormat === 'jpg' ? 'jpg' : 'png'}`,
      tip: '共 1 页',
    }
  }

  const zip = new JSZip()
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const canvas = await RenderPdfPageToCanvas(page, scale, fillWhite)
    const blob = await CanvasToBlob(canvas, mimeType, quality)
    const pageName = `${baseName}_p${String(pageNumber).padStart(2, '0')}.${
      imageFormat === 'jpg' ? 'jpg' : 'png'
    }`
    zip.file(pageName, blob)
    onProgress?.(Math.round((pageNumber / pageCount) * 100))
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return {
    blob: zipBlob,
    fileName: `${baseName}_${imageFormat}_pages.zip`,
    tip: `共 ${pageCount} 页，已打包为 ZIP`,
  }
}

/**
 * PDF 提取文本
 * @param file PDF 文件
 * @param onProgress 进度
 * @returns 转换结果
 */
export async function ConvertPdfToTxt(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<FileConvertResult> {
  const pdf = await LoadPdfDocument(file)
  const parts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent({
      includeMarkedContent: true,
    })
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('')
    parts.push(`----- 第 ${pageNumber} 页 -----\n${text}`)
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 100))
  }

  const blob = new Blob([parts.join('\n\n')], {
    type: 'text/plain;charset=utf-8',
  })
  return {
    blob,
    fileName: BuildConvertedName(file.name, 'txt'),
  }
}

/**
 * 判断文本是否像编码错误后的乱码
 * @param text 文本
 * @returns 是否疑似乱码
 */
function LooksLikeBrokenEncoding(text: string): boolean {
  if (!text) {
    return false
  }
  if (text.includes('\uFFFD')) {
    return true
  }
  // 常见：UTF-8 中文被按 Latin1 解读后的高频乱码片段
  const weird = (text.match(/[ÃÂäåæçèéêë]/g) || []).length
  return weird > 8 && weird / Math.max(text.length, 1) > 0.02
}

/**
 * 读取文本文件（优先 UTF-8，失败再尝试 GBK）
 * @param file 文本文件
 * @returns 解码后的字符串
 */
export async function ReadTextFileContent(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (!LooksLikeBrokenEncoding(utf8)) {
    return utf8
  }

  try {
    const gbk = new TextDecoder('gbk', { fatal: false }).decode(buffer)
    if (gbk && !LooksLikeBrokenEncoding(gbk)) {
      return gbk
    }
  } catch {
    // 部分环境不支持 gbk，忽略
  }

  return utf8
}

/**
 * 按画布字体宽度将文本折行（支持中文逐字换行）
 * @param ctx 2D 上下文（已设好 font）
 * @param text 原文
 * @param maxWidth 最大行宽
 * @returns 行数组
 */
function WrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('')
      return
    }

    let current = ''
    for (const char of Array.from(paragraph)) {
      const next = current + char
      if (current && ctx.measureText(next).width > maxWidth) {
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
 * 确保中文字体可用后再绘制
 * @returns Promise
 */
async function EnsureChineseFontReady(): Promise<void> {
  if (!document.fonts?.load) {
    return
  }
  try {
    await document.fonts.load('16px "Noto Sans SC"')
    await document.fonts.ready
  } catch {
    // 字体加载失败时回退系统中文字体
  }
}

/**
 * TXT 转 PDF（Canvas 排版，支持中文，避免 jsPDF 默认字体乱码）
 * @param file 文本文件
 * @returns 转换结果
 */
export async function ConvertTxtToPdf(file: File): Promise<FileConvertResult> {
  const text = await ReadTextFileContent(file)
  await EnsureChineseFontReady()

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const fontSize = 14
  const lineHeight = 22
  const contentWidth = pageWidth - margin * 2
  const contentHeight = pageHeight - margin * 2
  const scale = 2
  const fontFamily =
    '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'

  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) {
    throw new Error('Canvas 不可用')
  }
  measureCtx.font = `${fontSize}px ${fontFamily}`

  const lines = WrapCanvasText(measureCtx, text || ' ', contentWidth)
  const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeight))
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage))
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageLines = lines.slice(
      pageIndex * linesPerPage,
      (pageIndex + 1) * linesPerPage,
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(pageWidth * scale)
    canvas.height = Math.round(pageHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 不可用')
    }

    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageWidth, pageHeight)
    ctx.fillStyle = '#1f2a3d'
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.textBaseline = 'top'

    pageLines.forEach((line, index) => {
      ctx.fillText(line, margin, margin + index * lineHeight)
    })

    const imageData = canvas.toDataURL('image/jpeg', 0.92)
    if (pageIndex > 0) {
      doc.addPage()
    }
    doc.addImage(imageData, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  return {
    blob: doc.output('blob'),
    fileName: BuildConvertedName(file.name, 'pdf'),
  }
}

/**
 * DOCX 转 TXT / HTML
 * @param file Word 文件
 * @param target txt | html
 * @returns 转换结果
 */
export async function ConvertDocx(
  file: File,
  target: 'txt' | 'html',
): Promise<FileConvertResult> {
  const arrayBuffer = await file.arrayBuffer()
  if (target === 'html') {
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${file.name}</title></head><body>${result.value}</body></html>`
    return {
      blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
      fileName: BuildConvertedName(file.name, 'html'),
    }
  }

  const result = await mammoth.extractRawText({ arrayBuffer })
  return {
    blob: new Blob([result.value || ''], { type: 'text/plain;charset=utf-8' }),
    fileName: BuildConvertedName(file.name, 'txt'),
  }
}

/**
 * XLSX 转 CSV / JSON
 * @param file Excel 文件
 * @param target csv | json
 * @returns 转换结果
 */
export async function ConvertXlsx(
  file: File,
  target: 'csv' | 'json',
): Promise<FileConvertResult> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) {
    throw new Error('Excel 中没有工作表')
  }
  const sheet = workbook.Sheets[firstSheet]

  if (target === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(sheet)
    return {
      blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      fileName: BuildConvertedName(file.name, 'csv'),
    }
  }

  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const content = JSON.stringify(json, null, 2)
  return {
    blob: new Blob([content], { type: 'application/json;charset=utf-8' }),
    fileName: BuildConvertedName(file.name, 'json'),
  }
}

/**
 * CSV 转 JSON / TXT
 * @param file CSV 文件
 * @param target json | txt
 * @returns 转换结果
 */
export async function ConvertCsv(
  file: File,
  target: 'json' | 'txt',
): Promise<FileConvertResult> {
  const text = await file.text()
  if (target === 'txt') {
    return {
      blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
      fileName: BuildConvertedName(file.name, 'txt'),
    }
  }

  const workbook = XLSX.read(text, { type: 'string' })
  const firstSheet = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheet]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return {
    blob: new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json;charset=utf-8',
    }),
    fileName: BuildConvertedName(file.name, 'json'),
  }
}

/**
 * JSON 转 TXT / CSV
 * @param file JSON 文件
 * @param target txt | csv
 * @returns 转换结果
 */
export async function ConvertJson(
  file: File,
  target: 'txt' | 'csv',
): Promise<FileConvertResult> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败，请检查文件内容')
  }

  if (target === 'txt') {
    return {
      blob: new Blob([JSON.stringify(parsed, null, 2)], {
        type: 'text/plain;charset=utf-8',
      }),
      fileName: BuildConvertedName(file.name, 'txt'),
    }
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed
      ? [parsed]
      : [{ value: parsed }]
  const sheet = XLSX.utils.json_to_sheet(rows as Array<Record<string, unknown>>)
  const csv = XLSX.utils.sheet_to_csv(sheet)
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    fileName: BuildConvertedName(file.name, 'csv'),
  }
}

/**
 * HTML 转纯文本
 * @param file HTML 文件
 * @returns 转换结果
 */
export async function ConvertHtmlToTxt(file: File): Promise<FileConvertResult> {
  const html = await file.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const text = doc.body?.textContent || ''
  return {
    blob: new Blob([text.trim()], { type: 'text/plain;charset=utf-8' }),
    fileName: BuildConvertedName(file.name, 'txt'),
  }
}

/**
 * 按源/目标格式执行转换
 * @param file 源文件
 * @param target 目标格式
 * @param onProgress 进度回调
 * @returns 转换结果
 */
export async function ConvertFile(
  file: File,
  target: FileTargetFormat,
  onProgress?: (progress: number) => void,
): Promise<FileConvertResult> {
  const extension = ResolveFileExtension(file.name)
  const source = ResolveSourceFormat(extension)
  if (!source) {
    throw new Error('不支持的源格式')
  }

  const allowed = ResolveAvailableTargets(source).some(
    (item) => item.value === target,
  )
  if (!allowed) {
    throw new Error('不支持该转换路径')
  }

  onProgress?.(5)

  if (source === 'pdf' && (target === 'png' || target === 'jpg')) {
    return ConvertPdfToImages(file, target, onProgress)
  }
  if (source === 'pdf' && target === 'txt') {
    return ConvertPdfToTxt(file, onProgress)
  }
  if (source === 'txt' && target === 'pdf') {
    const result = await ConvertTxtToPdf(file)
    onProgress?.(100)
    return result
  }
  if (source === 'docx' && (target === 'txt' || target === 'html')) {
    const result = await ConvertDocx(file, target)
    onProgress?.(100)
    return result
  }
  if (source === 'xlsx' && (target === 'csv' || target === 'json')) {
    const result = await ConvertXlsx(file, target)
    onProgress?.(100)
    return result
  }
  if (source === 'csv' && (target === 'json' || target === 'txt')) {
    const result = await ConvertCsv(file, target)
    onProgress?.(100)
    return result
  }
  if (source === 'json' && (target === 'txt' || target === 'csv')) {
    const result = await ConvertJson(file, target)
    onProgress?.(100)
    return result
  }
  if (source === 'html' && target === 'txt') {
    const result = await ConvertHtmlToTxt(file)
    onProgress?.(100)
    return result
  }

  throw new Error('未实现的转换类型')
}

/**
 * 支持格式说明文案
 * @returns 说明
 */
export function ResolveSupportedHint(): string {
  return '支持同格式多文件批量转换。PDF→PNG/JPG/TXT，TXT→PDF，DOCX→TXT/HTML，XLSX→CSV/JSON，CSV↔JSON，JSON→TXT，HTML→TXT（不含 Word/Excel↔PDF）'
}
