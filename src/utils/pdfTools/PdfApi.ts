/**
 * PDF 工具站 —— 调用后端 API
 * 生产推荐同源 /api（Pages Functions → Worker Service Binding）
 * 开发可指向 http://127.0.0.1:8787
 */
import { GetApiBaseUrl } from '@/utils/Env'

/**
 * 归一化 API 根地址
 * 空 / same-origin / / → 同源（相对路径）
 * @returns 根 URL（无尾斜杠）；空字符串表示同源
 */
export function ResolvePdfApiRoot(): string {
  const raw = (GetApiBaseUrl() || '').trim().replace(/\/+$/, '')
  if (!raw || raw === '/' || raw === 'same-origin') {
    return ''
  }
  if (raw.endsWith('/api')) {
    return raw.slice(0, -4)
  }
  return raw
}

/**
 * 是否启用后端 API（含同源代理模式）
 * @returns boolean
 */
export function HasPdfApi(): boolean {
  const raw = (GetApiBaseUrl() || '').trim()
  if (!raw || raw === '/' || raw === 'same-origin') {
    return true
  }
  return Boolean(ResolvePdfApiRoot())
}

export type PdfApiResult = {
  blob: Blob
  fileName: string
}

/**
 * 从 Content-Disposition / 自定义头解析文件名
 * @param response 响应
 * @param fallback 回退名
 * @returns 文件名
 */
function ResolveFileName(response: Response, fallback: string): string {
  const custom = response.headers.get('X-Converted-Name')
  if (custom) {
    try {
      return decodeURIComponent(custom)
    } catch {
      return custom
    }
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  return fallback
}

/**
 * 调用 PDF API（multipart）
 * @param endpoint 如 /api/pdf/merge
 * @param files 文件列表
 * @param fields 额外字段
 * @returns 结果 Blob
 */
export async function CallPdfApi(
  endpoint: string,
  files: File[],
  fields: Record<string, string> = {},
): Promise<PdfApiResult> {
  if (!HasPdfApi()) {
    throw new Error('未配置 API，请设置 VITE_API_BASE_URL 或使用同源 /api 代理')
  }

  const form = new FormData()
  if (files.length === 1) {
    form.append('file', files[0], files[0].name)
  } else {
    files.forEach((file) => form.append('files', file, file.name))
  }
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, value)
  })

  const root = ResolvePdfApiRoot()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const response = await fetch(`${root}${path}`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    let message = `请求失败（${response.status}）`
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const fileName = ResolveFileName(response, files[0]?.name || 'result.bin')
  return { blob, fileName }
}

/**
 * 探测后端健康状态
 * @returns 是否可用
 */
export async function PingPdfApi(): Promise<boolean> {
  if (!HasPdfApi()) return false
  try {
    const root = ResolvePdfApiRoot()
    const response = await fetch(`${root}/api/health`, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 触发浏览器下载
 * @param blob 文件
 * @param fileName 名称
 */
export function DownloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
