/**
 * Fuse PDF API —— 默认入口（Worker-only，无需 Docker）
 * P0：pdf-lib；Word↔PDF / 加密需 deploy:full
 */
import {
  BuildCorsHeaders,
  BuildOutputName,
  CollectUploadFiles,
  FileResponse,
  GetMaxUploadBytes,
  HasLibreOffice,
  JsonResponse,
  type Env,
} from './http'
import {
  ImagesToPdf,
  MergePdfs,
  RotatePdf,
  SplitPdf,
  WatermarkPdf,
} from './pdf/operations'
import { ProxyToContainer } from './containerProxy'

/**
 * 将拆分页打包为简易 ZIP（store，无压缩）
 * @param files 文件列表
 * @returns ZIP 字节
 */
async function BuildStoreZip(
  files: Array<{ name: string; bytes: Uint8Array }>,
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const CrcTable = (() => {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i += 1) {
      let c = i
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[i] = c >>> 0
    }
    return table
  })()

  /**
   * 计算 CRC32
   * @param data 数据
   * @returns CRC
   */
  const Crc32 = (data: Uint8Array): number => {
    let crc = 0xffffffff
    for (let i = 0; i < data.length; i += 1) {
      crc = CrcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  /**
   * 写入小端 u32
   * @param view DataView
   * @param at 偏移
   * @param value 值
   */
  const WriteU32 = (view: DataView, at: number, value: number) => {
    view.setUint32(at, value, true)
  }

  for (const file of files) {
    const nameBytes = enc.encode(file.name)
    const crc = Crc32(file.bytes)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    WriteU32(lv, 0, 0x04034b50)
    lv.setUint16(8, 0, true)
    WriteU32(lv, 14, crc)
    WriteU32(lv, 18, file.bytes.length)
    WriteU32(lv, 22, file.bytes.length)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)

    parts.push(local, file.bytes)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    WriteU32(cv, 0, 0x02014b50)
    cv.setUint16(10, 0, true)
    WriteU32(cv, 16, crc)
    WriteU32(cv, 20, file.bytes.length)
    WriteU32(cv, 24, file.bytes.length)
    cv.setUint16(28, nameBytes.length, true)
    WriteU32(cv, 42, offset)
    cen.set(nameBytes, 46)
    central.push(cen)

    offset += local.length + file.bytes.length
  }

  const centralSize = central.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  WriteU32(ev, 0, 0x06054b50)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  WriteU32(ev, 12, centralSize)
  WriteU32(ev, 16, offset)

  const total =
    parts.reduce((s, p) => s + p.length, 0) + centralSize + end.length
  const out = new Uint8Array(total)
  let cursor = 0
  for (const p of parts) {
    out.set(p, cursor)
    cursor += p.length
  }
  for (const c of central) {
    out.set(c, cursor)
    cursor += c.length
  }
  out.set(end, cursor)
  return out
}

/**
 * 容器能力未开启时的统一错误响应
 * @param request 请求
 * @param env 环境
 * @returns Response
 */
function ContainerUnavailable(request: Request, env: Env): Response {
  return JsonResponse(request, env, 503, {
    error:
      '当前为 Worker-only 部署，未启用 Containers。Word↔PDF / 加密需本机 Docker 后执行 npm run deploy:full',
    needContainers: true,
  })
}

/**
 * 处理 API 路由
 * @param request 请求
 * @param env 环境
 * @returns Response
 */
export async function HandleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const containersOn = HasLibreOffice(env)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: BuildCorsHeaders(request, env),
    })
  }

  if (request.method === 'GET' && (path === '/api/health' || path === '/health')) {
    return JsonResponse(request, env, 200, {
      ok: true,
      service: 'fuse-pdf-api',
      mode: containersOn ? 'containers' : 'worker-only',
      features: {
        merge: true,
        split: true,
        rotate: true,
        watermark: true,
        'images-to-pdf': true,
        protect: containersOn,
        'docx-to-pdf': containersOn,
        'pdf-to-docx': containersOn,
      },
    })
  }

  if (request.method !== 'POST') {
    return JsonResponse(request, env, 405, { error: 'Method Not Allowed' })
  }

  const maxBytes = GetMaxUploadBytes(env)
  const formData = await request.formData()
  const files = await CollectUploadFiles(formData, maxBytes)

  if (path === '/api/pdf/merge') {
    if (files.length < 2) {
      return JsonResponse(request, env, 400, { error: '合并至少需要 2 个 PDF' })
    }
    const bytes = await MergePdfs(files)
    return FileResponse(request, env, bytes, 'merged.pdf', 'application/pdf')
  }

  if (path === '/api/pdf/split') {
    const pages = await SplitPdf(files[0])
    if (pages.length === 1) {
      return FileResponse(request, env, pages[0].bytes, pages[0].name, 'application/pdf')
    }
    const zip = await BuildStoreZip(pages)
    return FileResponse(
      request,
      env,
      zip,
      BuildOutputName(files[0].name, 'zip'),
      'application/zip',
    )
  }

  if (path === '/api/pdf/rotate') {
    const angle = Number(formData.get('angle') || '90')
    const bytes = await RotatePdf(files[0], angle)
    return FileResponse(
      request,
      env,
      bytes,
      BuildOutputName(files[0].name, 'pdf'),
      'application/pdf',
    )
  }

  if (path === '/api/pdf/watermark') {
    const text = String(formData.get('text') || '')
    const opacity = Number(formData.get('opacity') || '0.28')
    const bytes = await WatermarkPdf(files[0], text, opacity)
    return FileResponse(
      request,
      env,
      bytes,
      BuildOutputName(files[0].name, 'pdf'),
      'application/pdf',
    )
  }

  if (path === '/api/pdf/protect') {
    if (!containersOn) return ContainerUnavailable(request, env)
    const password = String(formData.get('password') || '')
    if (!password) {
      return JsonResponse(request, env, 400, { error: '密码不能为空' })
    }
    return ProxyToContainer(
      env,
      request,
      files[0],
      `/protect?password=${encodeURIComponent(password)}`,
      BuildOutputName(files[0].name, 'pdf'),
      'application/pdf',
    )
  }

  if (path === '/api/pdf/images-to-pdf') {
    const bytes = await ImagesToPdf(files)
    return FileResponse(request, env, bytes, 'images.pdf', 'application/pdf')
  }

  if (path === '/api/convert/docx-to-pdf') {
    if (!containersOn) return ContainerUnavailable(request, env)
    return ProxyToContainer(
      env,
      request,
      files[0],
      '/convert?to=pdf',
      BuildOutputName(files[0].name, 'pdf'),
      'application/pdf',
    )
  }

  if (path === '/api/convert/pdf-to-docx') {
    if (!containersOn) return ContainerUnavailable(request, env)
    return ProxyToContainer(
      env,
      request,
      files[0],
      '/convert?to=docx',
      BuildOutputName(files[0].name, 'docx'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  }

  return JsonResponse(request, env, 404, { error: 'Not Found', path })
}

export default {
  /**
   * Worker fetch 入口
   * @param request 请求
   * @param env 绑定
   * @returns Response
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await HandleApi(request, env)
    } catch (error) {
      console.error(error)
      return JsonResponse(request, env, 500, {
        error: error instanceof Error ? error.message : '服务器错误',
      })
    }
  },
}
