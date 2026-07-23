/**
 * AI 智能抠图工具模块
 * 基于 @bunnio/rembg-web + onnxruntime-web
 * 默认轻量 u2netp，可选高质量 silueta；模型同源托管，ORT 经 Vite ?url 打包避免 public 动态 import 报错
 */
import type { BaseSession } from '@bunnio/rembg-web'
import OrtWasmJsep from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import OrtWasmJsepMjs from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'
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

/** 各模型远程镜像（本地缺失时按序尝试，浏览器端按需下载） */
const MODELMIRRORS: Record<MattingModelId, string[]> = {
  u2netp: [
    'https://ghfast.top/https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
    'https://huggingface.co/fofr/comfyui/resolve/main/rembg/u2netp.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
  ],
  silueta: [
    'https://ghfast.top/https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
    'https://huggingface.co/fofr/comfyui/resolve/main/rembg/silueta.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
  ],
  'isnet-anime': [
    'https://ghfast.top/https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx',
    'https://huggingface.co/fofr/comfyui/resolve/main/rembg/isnet-anime.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx',
  ],
  'isnet-general-use': [
    'https://ghfast.top/https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
    'https://huggingface.co/fofr/comfyui/resolve/main/rembg/isnet-general-use.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
  ],
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
 * 带进度下载二进制
 * @param url 地址
 * @param onProgress 进度 0~100
 * @returns ArrayBuffer
 */
async function FetchArrayBufferWithProgress(
  url: string,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const total = Number(response.headers.get('content-length') || 0)
  if (!response.body || !total) {
    return response.arrayBuffer()
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    if (!value) {
      continue
    }
    chunks.push(value)
    received += value.length
    onProgress?.(Math.min(99, Math.round((received / total) * 100)))
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
    const mirrors = MODELMIRRORS[modelId] || []
    let lastError: unknown = null
    buffer = null
    for (let i = 0; i < mirrors.length; i += 1) {
      const mirror = mirrors[i]
      try {
        onProgress?.({
          step: 'downloading',
          progress: 1,
          message: `正在下载模型（镜像 ${i + 1}/${mirrors.length}）${GetModelSizeHint(modelId)}…`,
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
        }`,
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

  const ort = await import('onnxruntime-web')
  const rembg = await ImportRembg()

  // 经 Vite ?url 打包，避免 public/*.mjs 被当成源码动态 import 报错
  // 当前 ort 默认走 JSEP 运行时，故映射 jsep 资源
  ort.env.wasm.wasmPaths = {
    wasm: OrtWasmJsep,
    mjs: OrtWasmJsepMjs,
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
    lower.includes('timed out')
  ) {
    const sizeHint = GetModelSizeHint(modelId) || '~模型'
    return `模型加载失败（${sizeHint}）。请切换档位后等待自动下载完成，或检查网络后重试。`
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
 * 将多个模型输出按像素取最大值融合（U2Net 族侧输出）
 * @param outputs ORT 输出表
 * @returns 融合后的 mask
 */
function MergeMaxMaskOutputs(outputs: Record<string, { data: Float32Array | Float64Array | Int32Array | Uint8Array }>): Float32Array {
  const keys = Object.keys(outputs)
  if (!keys.length) {
    throw new Error('模型未返回蒙版输出')
  }
  const first = outputs[keys[0]].data
  const merged = new Float32Array(first.length)
  merged.set(first as ArrayLike<number>)
  for (let k = 1; k < keys.length; k += 1) {
    const data = outputs[keys[k]].data
    if (data.length !== merged.length) {
      continue
    }
    for (let i = 0; i < merged.length; i += 1) {
      const value = Number(data[i])
      if (value > merged[i]) {
        merged[i] = value
      }
    }
  }
  return merged
}

/**
 * 挑选对比度最高的单一输出（isnet 等单主输出模型更稳）
 * @param outputs ORT 输出表
 * @returns mask
 */
function PickBestMaskOutput(outputs: Record<string, { data: Float32Array | Float64Array | Int32Array | Uint8Array }>): Float32Array {
  const keys = Object.keys(outputs)
  if (!keys.length) {
    throw new Error('模型未返回蒙版输出')
  }
  let bestKey = keys[0]
  let bestScore = -1
  for (const key of keys) {
    const data = outputs[key].data
    let min = Number(data[0])
    let max = min
    let sum = 0
    for (let i = 0; i < data.length; i += 1) {
      const value = Number(data[i])
      if (value < min) min = value
      if (value > max) max = value
      sum += value
    }
    const mean = sum / data.length
    let variance = 0
    for (let i = 0; i < data.length; i += 1) {
      const diff = Number(data[i]) - mean
      variance += diff * diff
    }
    const score = variance / data.length + (max - min)
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }
  const source = outputs[bestKey].data
  const copied = new Float32Array(source.length)
  copied.set(source as ArrayLike<number>)
  return copied
}

/**
 * 按模型选择蒙版融合策略
 * @param modelId 模型
 * @param outputs 输出
 * @returns mask
 */
function BuildMaskFromOutputs(
  modelId: MattingModelId,
  outputs: Record<string, { data: Float32Array | Float64Array | Int32Array | Uint8Array }>,
): Float32Array {
  if (modelId === 'isnet-anime' || modelId === 'isnet-general-use') {
    return PickBestMaskOutput(outputs)
  }
  return MergeMaxMaskOutputs(outputs)
}

/**
 * 百分位裁剪后归一化到 0~1（避免极值把主体压成半透明灰）
 * @param mask 原始 mask
 * @param usePercentile 是否用 2%~98% 百分位
 * @returns 归一化 mask
 */
function NormalizeMaskValues(
  mask: Float32Array,
  usePercentile = false,
): Float32Array {
  let min = mask[0]
  let max = mask[0]
  if (usePercentile && mask.length > 64) {
    const sampleStep = Math.max(1, Math.floor(mask.length / 4096))
    const samples: number[] = []
    for (let i = 0; i < mask.length; i += sampleStep) {
      samples.push(mask[i])
    }
    samples.sort((a, b) => a - b)
    const lowIndex = Math.floor(samples.length * 0.02)
    const highIndex = Math.floor(samples.length * 0.98)
    min = samples[lowIndex]
    max = samples[Math.max(lowIndex + 1, highIndex)]
  } else {
    for (let i = 1; i < mask.length; i += 1) {
      const value = mask[i]
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  const range = max - min || 1
  const normalized = new Float32Array(mask.length)
  for (let i = 0; i < mask.length; i += 1) {
    const value = (mask[i] - min) / range
    normalized[i] = Math.min(1, Math.max(0, value))
  }
  return normalized
}

/**
 * 锐化 alpha：压缩中间灰带；preserve 更宽松以保留半透明细节
 * @param alpha 0~1
 * @param low 低于此视为背景
 * @param high 高于此视为前景
 * @returns 锐化后 alpha
 */
function HardenAlphaValue(alpha: number, low: number, high: number): number {
  if (alpha <= low) {
    return 0
  }
  if (alpha >= high) {
    return 1
  }
  const t = (alpha - low) / (high - low)
  // smoothstep
  return t * t * (3 - 2 * t)
}

/**
 * 获取模型对应的 alpha 处理档位
 * @param modelId 模型 id
 * @returns 锐化档
 */
function GetHardenMode(
  modelId: MattingModelId,
): 'preserve' | 'light' | 'strong' {
  // isnet 对复杂 3D 海报字常输出中灰蒙版，需抬升并收紧，否则主体发虚镂空
  if (modelId === 'isnet-anime' || modelId === 'isnet-general-use') {
    return 'strong'
  }
  if (modelId === 'silueta') {
    return 'strong'
  }
  return 'light'
}

/**
 * 用归一化 mask 对原图做抠图，并按档位处理 alpha
 * @param imageCanvas 原图
 * @param mask 模型分辨率归一化 mask
 * @param modelSide 模型边长
 * @param harden 锐化强度档
 * @returns PNG Blob
 */
async function CutoutWithMask(
  imageCanvas: HTMLCanvasElement,
  mask: Float32Array,
  modelSide: number,
  harden: 'preserve' | 'light' | 'strong',
): Promise<Blob> {
  const side = modelSide > 0 ? modelSide : Math.round(Math.sqrt(mask.length))
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = side
  maskCanvas.height = side
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) {
    throw new Error('无法创建蒙版画布')
  }
  const imageData = maskCtx.createImageData(side, side)
  const pixelCount = side * side
  for (let i = 0; i < pixelCount; i += 1) {
    const value = Math.round(Math.min(1, Math.max(0, mask[i] || 0)) * 255)
    const offset = i * 4
    imageData.data[offset] = value
    imageData.data[offset + 1] = value
    imageData.data[offset + 2] = value
    imageData.data[offset + 3] = 255
  }
  maskCtx.putImageData(imageData, 0, 0)

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

  const scaledMask = document.createElement('canvas')
  scaledMask.width = width
  scaledMask.height = height
  const scaledCtx = scaledMask.getContext('2d')
  if (!scaledCtx) {
    throw new Error('无法缩放蒙版')
  }
  // 高分辨率蒙版放大时用高质量插值，保留细线
  scaledCtx.imageSmoothingEnabled = true
  scaledCtx.imageSmoothingQuality = 'high'
  scaledCtx.drawImage(maskCanvas, 0, 0, width, height)
  const maskData = scaledCtx.getImageData(0, 0, width, height)

  let low = 0.18
  let high = 0.72
  let gamma = 1
  if (harden === 'strong') {
    // 抬升中灰主体后收紧阈值，减少立体字镂空发虚
    low = 0.22
    high = 0.58
    gamma = 0.55
  } else if (harden === 'preserve') {
    low = 0.12
    high = 0.78
    gamma = 0.65
  }

  for (let i = 0; i < resultData.data.length; i += 4) {
    let rawAlpha = maskData.data[i] / 255
    if (gamma !== 1) {
      rawAlpha = Math.pow(rawAlpha, gamma)
    }
    resultData.data[i + 3] = Math.round(HardenAlphaValue(rawAlpha, low, high) * 255)
  }
  ctx.putImageData(resultData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    result.toBlob((value) => {
      if (value) {
        resolve(value)
      } else {
        reject(new Error('导出 PNG 失败'))
      }
    }, 'image/png')
  })
  return blob
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
      message: `已缩小至 ${resized.width}×${resized.height} 再推理`,
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
    const usePercentile =
      modelId === 'isnet-anime' || modelId === 'isnet-general-use'
    const normalized = NormalizeMaskValues(merged, usePercentile)
    const modelSide =
      GetMattingModelSide(modelId) || Math.round(Math.sqrt(normalized.length))

    onProgress?.({
      step: 'postprocessing',
      progress: 80,
      message: '正在合成透明图…',
    })

    const blob = await CutoutWithMask(
      imageCanvas,
      normalized,
      modelSide,
      GetHardenMode(modelId),
    )

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
