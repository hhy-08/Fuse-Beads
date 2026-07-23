/**
 * 基于 pdf-lib 的 P0 PDF 处理能力
 * 合并 / 拆分 / 旋转 / 水印 / 加密 / 图片转 PDF
 */
import {
  PDFDocument,
  degrees,
  rgb,
  StandardFonts,
  type PDFPage,
} from 'pdf-lib'

/**
 * 合并多个 PDF
 * @param files PDF 文件数组
 * @returns 合并后的 PDF 字节
 */
export async function MergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  return merged.save()
}

/**
 * 按页拆分 PDF（每页一个文件，打成「逻辑列表」由调用方打包）
 * @param file PDF
 * @returns 每页 PDF 字节与文件名
 */
export async function SplitPdf(
  file: File,
): Promise<Array<{ name: string; bytes: Uint8Array }>> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const base = file.name.replace(/\.[^.]+$/, '') || 'page'
  const results: Array<{ name: string; bytes: Uint8Array }> = []
  for (let i = 0; i < src.getPageCount(); i += 1) {
    const out = await PDFDocument.create()
    const [page] = await out.copyPages(src, [i])
    out.addPage(page)
    results.push({
      name: `${base}_p${i + 1}.pdf`,
      bytes: await out.save(),
    })
  }
  return results
}

/**
 * 旋转 PDF 每一页
 * @param file PDF
 * @param angle 角度：90 / 180 / 270
 * @returns 新 PDF 字节
 */
export async function RotatePdf(file: File, angle: number): Promise<Uint8Array> {
  const allowed = [90, 180, 270]
  if (!allowed.includes(angle)) {
    throw new Error('旋转角度仅支持 90 / 180 / 270')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.getPages().forEach((page: PDFPage) => {
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  })
  return doc.save()
}

/**
 * 为每一页添加文字水印
 * @param file PDF
 * @param text 水印文案
 * @param opacity 透明度 0~1
 * @returns 新 PDF 字节
 */
export async function WatermarkPdf(
  file: File,
  text: string,
  opacity = 0.28,
): Promise<Uint8Array> {
  if (!text.trim()) {
    throw new Error('水印文字不能为空')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  for (const page of pages) {
    const { width, height } = page.getSize()
    const size = Math.max(18, Math.min(width, height) / 12)
    page.drawText(text, {
      x: width * 0.18,
      y: height * 0.45,
      size,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: Math.min(1, Math.max(0.05, opacity)),
      rotate: degrees(35),
    })
  }
  return doc.save()
}

/**
 * 将多张图片合成为 PDF（每图一页）
 * @param files 图片文件
 * @returns PDF 字节
 */
export async function ImagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const lower = file.name.toLowerCase()
    let image
    if (lower.endsWith('.png') || file.type === 'image/png') {
      image = await doc.embedPng(bytes)
    } else if (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      file.type === 'image/jpeg'
    ) {
      image = await doc.embedJpg(bytes)
    } else {
      throw new Error(`暂不支持图片格式：${file.name}（请用 JPG / PNG）`)
    }
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }
  return doc.save()
}
