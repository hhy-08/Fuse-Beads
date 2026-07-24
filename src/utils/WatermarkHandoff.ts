/**
 * 工具间图片交接（如 Markdown 卡片 → 加水印）
 * 使用 window + sessionStorage，避免 Vite 异步分包导致模块内变量各有一份
 */
import type { WatermarkImageItem } from '@/views/watermark/types'

/** 水印交接载荷 */
export type WatermarkHandoffPayload = {
  dataUrl: string
  fileName: string
}

/** window 挂载键（跨 chunk 单例） */
const WINDOWKEY = '__FUSE_WATERMARK_HANDOFF__'

/** sessionStorage 键（刷新/极端分包兜底） */
const STORAGEKEY = 'fuse-kit-watermark-handoff'

type HandoffHost = Window & {
  [WINDOWKEY]?: WatermarkHandoffPayload | null
}

/**
 * 规范化交接载荷
 * @param payload 原始载荷
 * @returns 规范化结果
 */
function NormalizePayload(
  payload: WatermarkHandoffPayload,
): WatermarkHandoffPayload {
  return {
    dataUrl: payload.dataUrl,
    fileName: payload.fileName || 'markdown-card.png',
  }
}

/**
 * 写入待送入水印工具的图片
 * @param payload dataURL 与文件名
 */
export function SetWatermarkHandoff(payload: WatermarkHandoffPayload): void {
  const next = NormalizePayload(payload)
  const host = window as HandoffHost
  host[WINDOWKEY] = next
  try {
    sessionStorage.setItem(STORAGEKEY, JSON.stringify(next))
  } catch {
    // 配额不足时仍保留 window 挂载
  }
}

/**
 * 读取并清空待送入水印的图片
 * @returns 载荷或 null
 */
export function ConsumeWatermarkHandoff(): WatermarkHandoffPayload | null {
  const host = window as HandoffHost
  const fromWindow = host[WINDOWKEY] || null
  host[WINDOWKEY] = null

  let fromStorage: WatermarkHandoffPayload | null = null
  try {
    const raw = sessionStorage.getItem(STORAGEKEY)
    if (raw) {
      sessionStorage.removeItem(STORAGEKEY)
      fromStorage = JSON.parse(raw) as WatermarkHandoffPayload
    }
  } catch {
    fromStorage = null
  }

  const payload = fromWindow?.dataUrl
    ? fromWindow
    : fromStorage?.dataUrl
      ? fromStorage
      : null
  return payload ? NormalizePayload(payload) : null
}

/**
 * 是否仍有未消费的交接图片（不消费）
 * @returns 布尔值
 */
export function HasWatermarkHandoff(): boolean {
  const host = window as HandoffHost
  if (host[WINDOWKEY]?.dataUrl) {
    return true
  }
  try {
    return Boolean(sessionStorage.getItem(STORAGEKEY))
  } catch {
    return false
  }
}

/**
 * Blob 转 dataURL
 * @param blob 二进制
 * @returns dataURL
 */
export function BlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(blob)
  })
}

/**
 * dataURL 转 File（用 fetch，避免大图 atob 失败）
 * @param dataUrl 图片 dataURL
 * @param fileName 文件名
 * @returns File
 */
async function DataUrlToFile(
  dataUrl: string,
  fileName: string,
): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, {
    type: blob.type || 'image/png',
  })
}

/**
 * 由 dataURL 构建水印列表项
 * @param dataUrl 图片 dataURL
 * @param fileName 展示/下载文件名
 * @returns 水印列表项
 */
export async function BuildWatermarkItemFromDataUrl(
  dataUrl: string,
  fileName: string,
): Promise<WatermarkImageItem> {
  const safeName = fileName || 'markdown-card.png'
  const file = await DataUrlToFile(dataUrl, safeName)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('交接图片加载失败'))
    el.src = dataUrl
  })
  return {
    file,
    displayName: safeName,
    kind: 'image',
    url: dataUrl,
    image,
    status: 'pending',
    processedData: '',
  }
}
