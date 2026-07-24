/**
 * AI 智能抠图工具模块
 * 基于 @bunnio/rembg-web + onnxruntime-web
 * 默认轻量 u2netp，可选高质量模型按需下载；ORT 使用经典 WASM（非 jsep，约 13MB）以符合 Cloudflare Pages 单文件 ≤25MiB
 */
import type { BaseSession } from '@bunnio/rembg-web'
import OrtWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import OrtWasmMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { GetBaseRoute } from '@/utils/Env'
import type { MattingModelId, MattingModelOption } from '@/views/imageMatting/types'

/** 进度回调信息 */
export type MattingProgressInfo = {
  step: string
  progress: number
  message: string
}

/** 推理前长边上限（像素），过大图会先缩小以提速降内存 */
export const MATTINGMAXSIDE = 2048

/** 是否已完成 runtime / 模型路径初始化 */
let isRuntimeReady = false

/** 当前已初始化的模型 session 缓存键 */
let activeSessionKey = ''

/** 当前复用的 session 实例 */
let activeSession: BaseSession | null = null

/**
 * 动态导入 rembg-web（避免首屏打包过重）
 * @returns rembg-web 模块
 */
async function ImportRembg() {
  return import('@bunnio/rembg-web')
}

/**
 * 拼接站点内静态资源 URL（兼容 VITE_BASE_ROUTE）
 * @param relativePath 相对 public 的路径，如 models/u2netp.onnx
 * @returns 绝对路径 URL
 */
function BuildPublicAssetUrl(relativePath: string): string {
  const base = GetBaseRoute()
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = relativePath.replace(/^\//, '')
  return `${normalizedBase}${normalizedPath}`
}

/**
 * 获取可选模型档位列表（默认轻量；大模型选中后再下载）
 * @returns 模型选项
 */
export function GetMattingModelOptions(): MattingModelOption[] {
  return [
    {
      id: 'u2netp',
      label: '轻量',
      sizeHint: '~5MB',
      tag: '默认',
      description: '体积小、速度快，复杂立体字海报往往更稳；安装后即可用',
    },
    {
      id: 'isnet-anime',
      label: '海报 / 插画',
      sizeHint: '~172MB',
      description: '1024 高清，偏动漫/插画主体；首次选用时自动下载',
    },
    {
      id: 'isnet-general-use',
      label: '通用高清',
      sizeHint: '~174MB',
      description: '1024 通用分割，适合实物场景；首次选用时自动下载',
    },
    {
      id: 'silueta',
      label: '人像 / 实物',
      sizeHint: '~43MB',
      description: '适合人像与商品；首次选用时自动下载',
    },
  ]
}

/** 各模型最小有效体积（字节），用于拒绝 HTML/截断包 */
const MODELMINBYTES: Record<MattingModelId, number> = {
  u2netp: 4 * 1024 * 1024,
  silueta: 40 * 1024 * 1024,
  'isnet-anime': 160 * 1024 * 1024,
  'isnet-general-use': 160 * 1024 * 1024,
}

/** 各模型远程镜像（浏览器需 CORS；优先 hf-mirror，避开 huggingface.co 墙与 GitHub 无 CORS） */
const MODELMIRRORS: Record<MattingModelId, string[]> = {
  u2netp: [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/u2netp.onnx?download=true',
    'https://huggingface.co/tomjackson2023/rembg/resolve/main/u2netp.onnx?download=true',
  ],
  silueta: [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/silueta.onnx?download=true',
    'https://huggingface.co/tomjackson2023/rembg/resolve/main/silueta.onnx?download=true',
  ],
  'isnet-anime': [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-anime.onnx?download=true',
    'https://hf-mirror.com/skytnt/anime-seg/resolve/main/isnetis.onnx?download=true',
    'https://huggingface.co/tomjackson2023/rembg/resolve/main/isnet-anime.onnx?download=true',
  ],
  'isnet-general-use': [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-general-use.onnx?download=true',
    'https://hf-mirror.com/SacredNoir/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx?download=true',
    'https://huggingface.co/tomjackson2023/rembg/resolve/main/isnet-general-use.onnx?download=true',
  ],
}

/**
 * 组装下载地址列表：同源代理优先（Vite/Pages 转发，彻底避开 CORS），再试公开镜像
 * @param modelId 模型 id
 * @returns URL 列表
 */
function GetModelDownloadUrls(modelId: MattingModelId): string[] {
  const proxyUrl = BuildPublicAssetUrl(
    `matting-proxy?id=${encodeURIComponent(modelId)}`,
  )
  return [proxyUrl, ...(MODELMIRRORS[modelId] || [])]
}

/** 已解析为 blob URL 的按需模型（避免被 GC） */
const modelBlobUrls: Partial<Record<MattingModelId, string>> = {}

/**
 * 判断二进制是否像有效 ONNX（拒 HTML / LFS 指针 / 过小文件）
 * @param bytes 文件字节
 * @param modelId 模型 id
 * @returns 是否可用
 */
function IsValidOnnxBuffer(bytes: ArrayBuffer, modelId: MattingModelId): boolean {
  const minBytes = MODELMINBYTES[modelId] || 1024 * 1024
  if (bytes.byteLength < minBytes) {
    return false
  }
  const view = new Uint8Array(bytes)
  const headText = new TextDecoder()
    .decode(view.slice(0, 80))
    .trimStart()
    .toLowerCase()
  if (
    headText.startsWith('<!doctype') ||
    headText.startsWith('<html') ||
    headText.startsWith('{') ||
    headText.startsWith('version https://git-lfs')
  ) {
    return false
  }
  const sample = new TextDecoder('latin1').decode(
    view.slice(0, Math.min(view.length, 1024)),
  )
  if (sample.includes('onnx') || sample.includes('ONNX')) {
    return true
  }
  // protobuf 常见起始字段标记
  return view[0] === 0x08 || view[0] === 0x0a
}

/**
 * 探测同源模型文件是否真实可用（避免 SPA 回退 HTML 被当成 onnx）
 * @param url 本地模型 URL
 * @param modelId 模型 id
 * @returns 是否可用
 */
async function ProbeLocalOnnxFile(
  url: string,
  modelId: MattingModelId,
): Promise<boolean> {
  try {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
    if (!head.ok) {
      return false
    }
    const contentLength = Number(head.headers.get('content-length') || 0)
    const minBytes = MODELMINBYTES[modelId] || 1024 * 1024
    if (contentLength > 0 && contentLength < minBytes) {
      return false
    }
    const contentType = (head.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) {
      return false
    }
    const range = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-127' },
      cache: 'no-cache',
    })
    if (!range.ok && range.status !== 206) {
      return false
    }
    const probe = await range.arrayBuffer()
    const view = new Uint8Array(probe)
    const headText = new TextDecoder().decode(view).trimStart().toLowerCase()
    if (
      headText.startsWith('<!doctype') ||
      headText.startsWith('<html') ||
      headText.startsWith('version https://git-lfs')
    ) {
      return false
    }
    // 无 content-length 时至少确认不是 HTML；体积由后续 session 再兜底
    if (contentLength === 0) {
      return view[0] === 0x08 || view[0] === 0x0a || headText.includes('onnx')
    }
    return true
  } catch {
    return false
  }
}

/**
 * 获取模型推理边长（u2net 族 320，isnet 族 1024）
 * @param modelId 模型 id
 * @returns 边长像素
 */
export function GetMattingModelSide(modelId: MattingModelId): number {
  if (modelId === 'isnet-anime' || modelId === 'isnet-general-use') {
    return 1024
  }
  return 320
}

/**
 * 获取模型体积提示文案
 * @param modelId 模型 id
 * @returns 体积说明
 */
function GetModelSizeHint(modelId: MattingModelId): string {
  const found = GetMattingModelOptions().find((item) => item.id === modelId)
  return found?.sizeHint || ''
}

/**
 * 打开 IndexedDB 模型库
 * @returns 数据库
 */
function OpenModelDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fuse-matting-models', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 从 IndexedDB 读取已缓存模型
 * @param modelId 模型 id
 * @returns ArrayBuffer 或 null
 */
async function ReadCachedModel(
  modelId: MattingModelId,
): Promise<ArrayBuffer | null> {
  try {
    const db = await OpenModelDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('models', 'readonly')
      const store = tx.objectStore('models')
      const req = store.get(modelId)
      req.onsuccess = () => {
        const row = req.result as { data?: ArrayBuffer } | undefined
        resolve(row?.data || null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/**
 * 写入 IndexedDB 模型缓存
 * @param modelId 模型 id
 * @param data 模型二进制
 */
async function WriteCachedModel(modelId: MattingModelId, data: ArrayBuffer) {
  try {
    const db = await OpenModelDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite')
      tx.objectStore('models').put({ id: modelId, data })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // 缓存失败不阻断抠图
  }
}

/**
 * 删除 IndexedDB 中损坏的模型缓存
 * @param modelId 模型 id
 */
async function DeleteCachedModel(modelId: MattingModelId) {
  try {
    const db = await OpenModelDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('models', 'readwrite')
      tx.objectStore('models').delete(modelId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // 忽略删除失败
  }
}

/**
 * 清除内存中的模型 blob URL 与 session，便于强制重下
 * @param modelId 模型 id
 */
async function InvalidateLoadedModel(modelId: MattingModelId) {
  const blobUrl = modelBlobUrls[modelId]
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    delete modelBlobUrls[modelId]
  }
  if (activeSessionKey === modelId && activeSession) {
    try {
      await activeSession.dispose()
    } catch {
      // 忽略
    }
    activeSession = null
    activeSessionKey = ''
  }
  await DeleteCachedModel(modelId)
}

/**
 * 强制重新下载并绑定模型（用于损坏缓存修复）
 * @param modelId 模型 id
 * @param onProgress 进度回调
 */
export async function RedownloadMattingModel(
  modelId: MattingModelId,
  onProgress?: (info: MattingProgressInfo) => void,
) {
  await InvalidateLoadedModel(modelId)
  await EnsureMattingModelReady(modelId, onProgress, true)
}

/**
 * 检查同源 public/models 是否已有文件
 * @param modelId 模型档位
 * @returns 是否可访问
 */
export async function CheckMattingModelReady(
  modelId: MattingModelId,
): Promise<boolean> {
  if (modelBlobUrls[modelId]) {
    return true
  }
  const cached = await ReadCachedModel(modelId)
  if (cached && IsValidOnnxBuffer(cached, modelId)) {
    return true
  }
  const url = BuildPublicAssetUrl(`models/${modelId}.onnx`)
  return ProbeLocalOnnxFile(url, modelId)
}

/**
 * 带进度下载二进制；无 content-length 时按预估体积估算进度；停滞超时中止
 * @param url 地址
 * @param onProgress 进度 0~100
 * @param stallTimeoutMs 无数据流入超时（毫秒）
 * @returns ArrayBuffer
 */
async function FetchArrayBufferWithProgress(
  url: string,
  onProgress?: (percent: number) => void,
  stallTimeoutMs = 90000,
): Promise<ArrayBuffer> {
  const controller = new AbortController()
  let timer = window.setTimeout(() => controller.abort(), stallTimeoutMs)

  /**
   * 收到数据后重置停滞计时器
   */
  const ResetStallTimer = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => controller.abort(), stallTimeoutMs)
  }

  let response: Response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    })
  } catch (error) {
    window.clearTimeout(timer)
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw new Error('下载超时（长时间无响应），请换镜像或检查网络')
    }
    throw error
  }

  if (!response.ok) {
    window.clearTimeout(timer)
    throw new Error(`HTTP ${response.status}`)
  }

  const total = Number(response.headers.get('content-length') || 0)
  const estimatedTotal = total || 180 * 1024 * 1024

  if (!response.body) {
    window.clearTimeout(timer)
    const buffer = await response.arrayBuffer()
    onProgress?.(100)
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      ResetStallTimer()
      if (done) {
        break
      }
      if (!value) {
        continue
      }
      chunks.push(value)
      received += value.length
      onProgress?.(
        Math.min(99, Math.round((received / estimatedTotal) * 100)),
      )
    }
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw new Error('下载超时（长时间无响应），请换镜像或检查网络')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }

  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  onProgress?.(100)
  return merged.buffer
}

/**
 * 确保模型可用：本地 → IndexedDB → 远程镜像按需下载
 * @param modelId 模型 id
 * @param onProgress 进度回调
 * @param forceRemote 强制走远程下载（跳过本地与旧缓存）
 */
export async function EnsureMattingModelReady(
  modelId: MattingModelId,
  onProgress?: (info: MattingProgressInfo) => void,
  forceRemote = false,
) {
  await EnsureRuntimeReady()
  const rembg = await ImportRembg()

  if (!forceRemote && modelBlobUrls[modelId]) {
    rembg.rembgConfig.setCustomModelPath(modelId, modelBlobUrls[modelId]!)
    return
  }

  if (!forceRemote) {
    const localUrl = BuildPublicAssetUrl(`models/${modelId}.onnx`)
    const isLocalOk = await ProbeLocalOnnxFile(localUrl, modelId)
    if (isLocalOk) {
      rembg.rembgConfig.setCustomModelPath(modelId, localUrl)
      return
    }
  }

  onProgress?.({
    step: 'downloading',
    progress: 0,
    message: `正在准备模型 ${GetModelSizeHint(modelId)}…`,
  })

  let buffer: ArrayBuffer | null = null
  if (!forceRemote) {
    buffer = await ReadCachedModel(modelId)
    if (buffer && !IsValidOnnxBuffer(buffer, modelId)) {
      await DeleteCachedModel(modelId)
      buffer = null
    }
  }

  if (!buffer || !IsValidOnnxBuffer(buffer, modelId)) {
    const mirrors = GetModelDownloadUrls(modelId)
    let lastError: unknown = null
    buffer = null
    for (let i = 0; i < mirrors.length; i += 1) {
      const mirror = mirrors[i]
      try {
        onProgress?.({
          step: 'downloading',
          progress: 1,
          message: `正在下载模型（源 ${i + 1}/${mirrors.length}）${GetModelSizeHint(modelId)}…`,
        })
        const downloaded = await FetchArrayBufferWithProgress(mirror, (percent) => {
          onProgress?.({
            step: 'downloading',
            progress: percent,
            message: `下载模型 ${percent}%（${GetModelSizeHint(modelId)}）`,
          })
        })
        if (!IsValidOnnxBuffer(downloaded, modelId)) {
          throw new Error(
            `镜像返回无效文件（期望约 ${GetModelSizeHint(modelId)}）`,
          )
        }
        buffer = downloaded
        await WriteCachedModel(modelId, buffer)
        break
      } catch (error) {
        lastError = error
        buffer = null
      }
    }
    if (!buffer || !IsValidOnnxBuffer(buffer, modelId)) {
      throw new Error(
        `模型下载失败（${GetModelSizeHint(modelId)}）。${
          lastError instanceof Error ? lastError.message : '请检查网络后重试'
        }。也可执行 npm run sync-matting 预置到 public/models`,
      )
    }
  } else {
    onProgress?.({
      step: 'downloading',
      progress: 100,
      message: '已从本地缓存加载模型',
    })
  }

  if (modelBlobUrls[modelId]) {
    URL.revokeObjectURL(modelBlobUrls[modelId]!)
  }
  const blobUrl = URL.createObjectURL(
    new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' }),
  )
  modelBlobUrls[modelId] = blobUrl
  rembg.rembgConfig.setCustomModelPath(modelId, blobUrl)
}

/**
 * 配置 ONNX Runtime（Vite 资源 URL + Worker proxy）与模型路径
 */
async function EnsureRuntimeReady() {
  if (isRuntimeReady) {
    return
  }

  // 使用 wasm 专用入口（非默认 jsep），配套经典 threaded.wasm（约 13MB）
  const ort = await import('onnxruntime-web/wasm')
  const rembg = await ImportRembg()

  // 经 Vite ?url 打包，避免 public/*.mjs 被当成源码动态 import 报错
  ort.env.wasm.wasmPaths = {
    wasm: OrtWasm,
    mjs: OrtWasmMjs,
  }
  // 放入 Web Worker，减轻主线程卡顿
  ort.env.wasm.proxy = true
  ort.env.wasm.numThreads = Math.min(
    4,
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2,
  )

  rembg.rembgConfig.setCustomModelPath(
    'u2netp',
    BuildPublicAssetUrl('models/u2netp.onnx'),
  )
  // 其它大模型不在启动时绑定路径，等用户选择后再下载并 setCustomModelPath

  isRuntimeReady = true
}

/**
 * 获取或创建指定模型的推理 session
 * @param modelId 模型档位
 * @param onProgress 进度回调
 * @returns session 实例
 */
async function GetOrCreateSession(
  modelId: MattingModelId,
  onProgress?: (info: MattingProgressInfo) => void,
): Promise<BaseSession> {
  await EnsureMattingModelReady(modelId, onProgress)
  const rembg = await ImportRembg()

  if (activeSession && activeSessionKey === modelId) {
    return activeSession
  }

  if (activeSession) {
    try {
      await activeSession.dispose()
    } catch {
      // 忽略释放失败，继续创建新 session
    }
    activeSession = null
    activeSessionKey = ''
  }

  /**
   * 创建 session；protobuf 损坏时清缓存并强制重下一次
   * @param allowRetry 是否允许重试
   * @returns session
   */
  const CreateSession = async (allowRetry: boolean): Promise<BaseSession> => {
    try {
      const session = await rembg.newSession(modelId, undefined, {
        proxy: true,
        executionProviders: ['wasm'],
        bypassModelCache: true,
        bypassSessionCache: true,
        onProgress,
      })
      return session
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isCorrupt =
        /protobuf parsing failed|failed to load model|ERROR_CODE:\s*7/i.test(
          message,
        )
      if (!allowRetry || !isCorrupt) {
        throw error
      }
      onProgress?.({
        step: 'downloading',
        progress: 0,
        message: '检测到模型文件损坏，正在重新下载…',
      })
      await InvalidateLoadedModel(modelId)
      await EnsureMattingModelReady(modelId, onProgress, true)
      return CreateSession(false)
    }
  }

  const session = await CreateSession(true)
  activeSession = session
  activeSessionKey = modelId
  return session
}

/**
 * 从 File 加载预览图信息
 * @param file 图片文件
 * @returns 宽高与本地预览 URL
 */
export function LoadMattingSource(
  file: File,
): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({
        url,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}

/**
 * 将图片按长边上限缩小，返回用于推理的 Blob（未超限则原样返回）
 * @param file 原图
 * @param maxSide 长边像素上限
 * @returns 可能缩小后的 Blob 与是否发生缩放
 */
export async function ResizeImageForMatting(
  file: File,
  maxSide = MATTINGMAXSIDE,
): Promise<{ blob: Blob; didResize: boolean; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('图片加载失败'))
      el.src = objectUrl
    })

    const srcWidth = image.naturalWidth || image.width
    const srcHeight = image.naturalHeight || image.height
    const longSide = Math.max(srcWidth, srcHeight)

    if (longSide <= maxSide) {
      return {
        blob: file,
        didResize: false,
        width: srcWidth,
        height: srcHeight,
      }
    }

    const scale = maxSide / longSide
    const width = Math.max(1, Math.round(srcWidth * scale))
    const height = Math.max(1, Math.round(srcHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建画布')
    }
    ctx.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('图片缩放失败'))
          }
        },
        'image/png',
      )
    })

    return { blob, didResize: true, width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 将技术错误转为可读中文提示
 * @param error 原始错误
 * @param modelId 模型档位
 * @returns 中文错误文案
 */
export function FormatMattingError(
  error: unknown,
  modelId: MattingModelId,
): string {
  const raw = error instanceof Error ? error.message : String(error || '')
  const lower = raw.toLowerCase()
  if (
    lower.includes('protobuf') ||
    lower.includes('failed to load model') ||
    lower.includes('error_code: 7')
  ) {
    return `模型文件损坏或不完整（${GetModelSizeHint(modelId) || '~模型'}）。请重新选择该档位触发下载，或刷新后重试。`
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('download') ||
    lower.includes('err_connection') ||
    lower.includes('timed out') ||
    lower.includes('超时') ||
    lower.includes('cors')
  ) {
    const sizeHint = GetModelSizeHint(modelId) || '~模型'
    return `模型下载失败（${sizeHint}）。请改用「轻量」或执行 npm run sync-matting 预置本地模型后重试。`
  }
  if (
    lower.includes('no available backend') ||
    lower.includes('jsep') ||
    lower.includes('ort-wasm')
  ) {
    return '推理引擎加载失败。请刷新页面重试；若仍失败请检查控制台 ORT / WASM 资源是否加载成功。'
  }
  if (lower.includes('out of memory') || lower.includes('oom')) {
    return '内存不足，请换更小图片或改用轻量模型'
  }
  return raw || '抠图失败，请更换图片后重试'
}

/**
 * 将 Blob/File 转为画布
 * @param source 图片源
 * @returns canvas
 */
async function BlobToCanvas(source: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('无法创建画布')
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas
}

/**
 * 取模型主输出（U2Net d0 / ISNet 主分支），忽略深监督侧输出
 * @param _modelId 模型 id（保留参数便于调用处统一）
 * @param outputs ORT 输出表
 * @returns 主 mask
 */
function BuildMaskFromOutputs(
  _modelId: MattingModelId,
  outputs: Record<
    string,
    { data: Float32Array | Float64Array | Int32Array | Uint8Array }
  >,
): Float32Array {
  const keys = Object.keys(outputs)
  if (!keys.length) {
    throw new Error('模型未返回蒙版输出')
  }
  // 优先按常见主输出名取值；否则取 ORT 图定义顺序的第一个
  const preferred =
    keys.find((key) => /^(d0|output|mask|saliency)$/i.test(key)) || keys[0]
  const source = outputs[preferred].data
  const out = new Float32Array(source.length)
  out.set(source as ArrayLike<number>)
  return out
}

/**
 * 确保 mask 落在 0~1；仅在模型未内置 sigmoid 时兜底，不做 min-max 拉伸
 * @param mask 原始 mask
 * @returns 0~1 概率 mask
 */
function EnsureProbabilityMask(mask: Float32Array): Float32Array {
  let min = mask[0]
  let max = mask[0]
  for (let i = 1; i < mask.length; i += 1) {
    if (mask[i] < min) min = mask[i]
    if (mask[i] > max) max = mask[i]
  }
  // 已是概率分布则原样返回，不做任何拉伸
  if (min >= -0.01 && max <= 1.01) {
    return mask
  }
  // 疑似 logits，走 sigmoid 而非 min-max
  const out = new Float32Array(mask.length)
  for (let i = 0; i < mask.length; i += 1) {
    out[i] = 1 / (1 + Math.exp(-mask[i]))
  }
  return out
}

/**
 * 用 float mask 双线性采样到原图像素，温和压缩两端噪声后合成透明 PNG
 * @param imageCanvas 原图
 * @param mask 模型分辨率 0~1 mask
 * @param modelSide 模型边长
 * @returns PNG Blob
 */
async function CutoutWithMask(
  imageCanvas: HTMLCanvasElement,
  mask: Float32Array,
  modelSide: number,
): Promise<Blob> {
  const side = modelSide > 0 ? modelSide : Math.round(Math.sqrt(mask.length))
  const width = imageCanvas.width
  const height = imageCanvas.height

  const result = document.createElement('canvas')
  result.width = width
  result.height = height
  const ctx = result.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建结果画布')
  }
  ctx.drawImage(imageCanvas, 0, 0)
  const resultData = ctx.getImageData(0, 0, width, height)

  /**
   * 在 float mask 上直接双线性采样，避免 8bit canvas 量化损失
   * @param x 原图像素 x
   * @param y 原图像素 y
   * @returns 采样 alpha 0~1
   */
  const SampleMask = (x: number, y: number): number => {
    const fx = ((x + 0.5) / width) * side - 0.5
    const fy = ((y + 0.5) / height) * side - 0.5
    const x0 = Math.max(0, Math.min(side - 1, Math.floor(fx)))
    const y0 = Math.max(0, Math.min(side - 1, Math.floor(fy)))
    const x1 = Math.min(side - 1, x0 + 1)
    const y1 = Math.min(side - 1, y0 + 1)
    const tx = Math.max(0, Math.min(1, fx - x0))
    const ty = Math.max(0, Math.min(1, fy - y0))
    const a = mask[y0 * side + x0] || 0
    const b = mask[y0 * side + x1] || 0
    const c = mask[y1 * side + x0] || 0
    const d = mask[y1 * side + x1] || 0
    return (
      a * (1 - tx) * (1 - ty) +
      b * tx * (1 - ty) +
      c * (1 - tx) * ty +
      d * tx * ty
    )
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let alpha = SampleMask(x, y)
      // 只压缩两端噪声，中间区间线性保留 —— 保住发丝与抗锯齿
      if (alpha < 0.05) {
        alpha = 0
      } else if (alpha > 0.95) {
        alpha = 1
      }
      resultData.data[(y * width + x) * 4 + 3] = Math.round(
        Math.min(1, Math.max(0, alpha)) * 255,
      )
    }
  }
  ctx.putImageData(resultData, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    result.toBlob((value) => {
      if (value) {
        resolve(value)
      } else {
        reject(new Error('导出 PNG 失败'))
      }
    }, 'image/png')
  })
}

/**
 * 执行 AI 抠图，返回透明 PNG Blob
 * @param file 原图文件
 * @param modelId 模型档位
 * @param onProgress 进度回调
 * @returns 抠图结果 Blob
 */
export async function RemoveImageBackground(
  file: File,
  modelId: MattingModelId,
  onProgress?: (info: MattingProgressInfo) => void,
): Promise<Blob> {
  onProgress?.({
    step: 'processing',
    progress: 5,
    message: '正在缩放图片…',
  })
  const resized = await ResizeImageForMatting(file, MATTINGMAXSIDE)
  if (resized.didResize) {
    onProgress?.({
      step: 'processing',
      progress: 12,
      message: `已缩小至 ${resized.width}×${resized.height} 再合成`,
    })
  }

  try {
    const session = await GetOrCreateSession(modelId, onProgress)
    onProgress?.({
      step: 'processing',
      progress: 35,
      message:
        GetMattingModelSide(modelId) >= 1024
          ? '正在高清推理（约 1024），请稍候…'
          : '正在推理蒙版…',
    })

    const imageCanvas = await BlobToCanvas(resized.blob)
    const sessionWithInit = session as BaseSession & {
      initialize: () => Promise<void>
    }
    await sessionWithInit.initialize()

    const input = session.prepareInput(imageCanvas)
    const outputs = await session.runInference(input)
    const merged = BuildMaskFromOutputs(
      modelId,
      outputs as Record<
        string,
        { data: Float32Array | Float64Array | Int32Array | Uint8Array }
      >,
    )
    const probability = EnsureProbabilityMask(merged)
    const modelSide =
      GetMattingModelSide(modelId) || Math.round(Math.sqrt(probability.length))

    onProgress?.({
      step: 'postprocessing',
      progress: 80,
      message: '正在合成透明图…',
    })

    const blob = await CutoutWithMask(imageCanvas, probability, modelSide)

    onProgress?.({
      step: 'complete',
      progress: 100,
      message: '完成',
    })
    return blob
  } catch (error) {
    throw new Error(FormatMattingError(error, modelId))
  }
}

/**
 * 下载 Blob 为本地文件
 * @param blob 文件内容
 * @param fileName 下载文件名
 */
export function DownloadMattingBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

/**
 * 释放 blob URL
 * @param url 对象 URL
 */
export function RevokeMattingUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * 生成抠图导出文件名
 * @param originalName 原文件名
 * @returns 导出文件名
 */
export function BuildMattingFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'matting'
  return `${base}_cutout.png`
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 可读字符串
 */
export function FormatMattingFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
