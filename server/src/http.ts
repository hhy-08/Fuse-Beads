/**
 * Worker 环境类型与通用工具
 */
import type { LibreOfficeContainer } from './LibreOfficeContainer'

export type Env = {
  /** 仅完整版（Containers）部署时存在 */
  LIBRE_OFFICE?: DurableObjectNamespace<LibreOfficeContainer>
  ALLOWED_ORIGINS: string
  MAX_UPLOAD_BYTES: string
  ENABLE_CONTAINERS?: string
}

/**
 * 当前部署是否启用了 LibreOffice 容器
 * @param env 环境
 * @returns 是否可用
 */
export function HasLibreOffice(env: Env): boolean {
  return Boolean(env.LIBRE_OFFICE) && env.ENABLE_CONTAINERS === '1'
}

/**
 * 解析允许的跨域来源列表
 * @param env Worker 环境
 * @returns 来源数组
 */
export function ParseAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * 根据请求 Origin 生成 CORS 头
 * @param request 请求
 * @param env 环境
 * @returns 响应头
 */
export function BuildCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') || ''
  const allowed = ParseAllowedOrigins(env)
  const isAllowed = !origin || allowed.includes(origin) || allowed.includes('*')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition, X-Converted-Name',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * 带 CORS 的 JSON 响应
 * @param request 请求
 * @param env 环境
 * @param status 状态码
 * @param data 数据
 * @returns Response
 */
export function JsonResponse(
  request: Request,
  env: Env,
  status: number,
  data: unknown,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...BuildCorsHeaders(request, env),
    },
  })
}

/**
 * 带 CORS 的二进制文件响应
 * @param request 请求
 * @param env 环境
 * @param body 文件体
 * @param fileName 下载名
 * @param mime MIME
 * @returns Response
 */
export function FileResponse(
  request: Request,
  env: Env,
  body: ArrayBuffer | Uint8Array,
  fileName: string,
  mime: string,
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Converted-Name': encodeURIComponent(fileName),
      ...BuildCorsHeaders(request, env),
    },
  })
}

/**
 * 读取上传大小上限
 * @param env 环境
 * @returns 字节数
 */
export function GetMaxUploadBytes(env: Env): number {
  const parsed = Number(env.MAX_UPLOAD_BYTES || '52428800')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50 * 1024 * 1024
}

/**
 * 从 multipart 表单读取全部名为 file / files 的文件
 * @param formData FormData
 * @param maxBytes 总大小上限
 * @returns 文件列表
 */
export async function CollectUploadFiles(
  formData: FormData,
  maxBytes: number,
): Promise<File[]> {
  const files: File[] = []
  let total = 0
  for (const [key, value] of formData.entries()) {
    if ((key === 'file' || key === 'files') && value instanceof File) {
      total += value.size
      if (total > maxBytes) {
        throw new Error(`上传总大小超过限制 ${maxBytes} 字节`)
      }
      files.push(value)
    }
  }
  if (!files.length) {
    throw new Error('请上传至少一个文件（字段名 file 或 files）')
  }
  return files
}

/**
 * 生成安全输出文件名
 * @param original 原名
 * @param ext 新扩展名（含点或不含均可）
 * @returns 文件名
 */
export function BuildOutputName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'output'
  const normalized = ext.startsWith('.') ? ext : `.${ext}`
  return `${base}${normalized}`
}
