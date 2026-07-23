/**
 * 基于 pdf-lib 的 P0 PDF 处理能力
 * 合并 / 拆分 / 旋转 / 水印 / 图片转 PDF
 */
import {
  PDFDocument,
  degrees,
  rgb,
  StandardFonts,
  type PDFFont,
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

/** 九宫格位置 ID */
export type WatermarkPositionId =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'middleLeft'
  | 'center'
  | 'middleRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'

/** PDF 文字水印参数 */
export type WatermarkOptions = {
  text: string
  /** 0~1 */
  opacity: number
  fontSize: number
  /** -180~180 */
  rotation: number
  /** #rrggbb */
  color: string
  position: WatermarkPositionId
  isTiled: boolean
  tileSpacingX: number
  tileSpacingY: number
}

/**
 * 解析 #rgb / #rrggbb 为 0~1 分量
 * @param hex 颜色
 * @returns rgb
 */
function ParseHexColor(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '').trim()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 0.45, g: 0.45, b: 0.45 }
  }
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  }
}

/**
 * 按九宫格计算水印基线起点（PDF 坐标：原点左下）
 * @param width 页宽
 * @param height 页高
 * @param textWidth 文字宽
 * @param fontSize 字号
 * @param position 位置
 * @returns 坐标
 */
function ResolvePositionPoint(
  width: number,
  height: number,
  textWidth: number,
  fontSize: number,
  position: WatermarkPositionId,
): { x: number; y: number } {
  const margin = Math.max(16, fontSize * 0.5)
  const map: Record<WatermarkPositionId, { x: number; y: number }> = {
    topLeft: { x: margin, y: height - margin - fontSize },
    topCenter: { x: (width - textWidth) / 2, y: height - margin - fontSize },
    topRight: { x: width - margin - textWidth, y: height - margin - fontSize },
    middleLeft: { x: margin, y: (height - fontSize) / 2 },
    center: { x: (width - textWidth) / 2, y: (height - fontSize) / 2 },
    middleRight: { x: width - margin - textWidth, y: (height - fontSize) / 2 },
    bottomLeft: { x: margin, y: margin },
    bottomCenter: { x: (width - textWidth) / 2, y: margin },
    bottomRight: { x: width - margin - textWidth, y: margin },
  }
  return map[position] || map.center
}

/**
 * 在指定基线坐标绘制文字水印
 * @param page 页
 * @param font 字体
 * @param text 文案
 * @param x 基线 x
 * @param y 基线 y
 * @param fontSize 字号
 * @param rotation 角度（支持负值）
 * @param color 颜色
 * @param opacity 透明度
 */
function DrawWatermarkAt(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  rotation: number,
  color: { r: number; g: number; b: number },
  opacity: number,
) {
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity,
    rotate: degrees(rotation),
  })
}

/**
 * 为每一页添加文字水印（支持字号 / 颜色 / 旋转 / 九宫格 / 平铺）
 * @param file PDF
 * @param options 水印参数
 * @returns 新 PDF 字节
 */
export async function WatermarkPdf(
  file: File,
  options: WatermarkOptions,
): Promise<Uint8Array> {
  const text = options.text.trim()
  if (!text) {
    throw new Error('水印文字不能为空')
  }

  const fontSize = Math.min(120, Math.max(8, Number(options.fontSize) || 24))
  const rotation = Math.min(180, Math.max(-180, Number(options.rotation) || 0))
  const opacity = Math.min(1, Math.max(0.05, Number(options.opacity) || 0.28))
  const color = ParseHexColor(options.color || '#737373')
  const position = options.position || 'center'
  const isTiled = Boolean(options.isTiled)
  const tileSpacingX = Math.min(400, Math.max(20, Number(options.tileSpacingX) || 100))
  const tileSpacingY = Math.min(400, Math.max(20, Number(options.tileSpacingY) || 100))

  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const textWidth = font.widthOfTextAtSize(text, fontSize)

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()

    if (isTiled) {
      const tileWidth = Math.max(textWidth + 8, textWidth + tileSpacingX)
      const tileHeight = Math.max(fontSize + 8, fontSize + tileSpacingY)
      const origin = ResolvePositionPoint(width, height, textWidth, fontSize, position)
      const offsetX = ((origin.x % tileWidth) + tileWidth) % tileWidth
      const offsetY = ((origin.y % tileHeight) + tileHeight) % tileHeight
      const startX = offsetX - tileWidth
      const startY = offsetY - tileHeight
      const cols = Math.ceil((width - startX) / tileWidth) + 1
      const rows = Math.ceil((height - startY) / tileHeight) + 1

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = startX + col * tileWidth
          const y = startY + row * tileHeight
          if (x > width + tileWidth || y > height + tileHeight) continue
          if (x + textWidth < -tileWidth || y + fontSize < -tileHeight) continue
          DrawWatermarkAt(page, font, text, x, y, fontSize, rotation, color, opacity)
        }
      }
    } else {
      const point = ResolvePositionPoint(width, height, textWidth, fontSize, position)
      DrawWatermarkAt(
        page,
        font,
        text,
        point.x,
        point.y,
        fontSize,
        rotation,
        color,
        opacity,
      )
    }
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
