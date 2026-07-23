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
 * 获取可选模型档位列表
 * @returns 模型选项
 */
export function GetMattingModelOptions(): MattingModelOption[] {
  return [
    {
      id: 'u2netp',
      label: '轻量',
      sizeHint: '~5MB',
      description: '体积小、速度快，适合日常抠图；首次加载约 5MB',
    },
    {
      id: 'silueta',
      label: '高质量',
      sizeHint: '~43MB',
      description: '边缘更稳；首次加载约 43MB，低端机可能较慢',
    },
  ]
}

/**
 * 检查同源模型文件是否可用
 * @param modelId 模型档位
 * @returns 是否可访问
 */
export async function CheckMattingModelReady(
  modelId: MattingModelId,
): Promise<boolean> {
  const url = BuildPublicAssetUrl(`models/${modelId}.onnx`)
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
    return response.ok
  } catch {
    return false
  }
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
  rembg.rembgConfig.setCustomModelPath(
    'silueta',
    BuildPublicAssetUrl('models/silueta.onnx'),
  )

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
  await EnsureRuntimeReady()
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

  const session = await rembg.newSession(modelId, undefined, {
    proxy: true,
    executionProviders: ['wasm'],
    onProgress,
  })
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
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('download') ||
    lower.includes('err_connection') ||
    lower.includes('timed out')
  ) {
    const sizeHint = modelId === 'silueta' ? '~43MB' : '~5MB'
    return `模型加载失败（${sizeHint}）。请确认已执行 npm run sync-matting，或检查网络后重试。`
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
  const isReady = await CheckMattingModelReady(modelId)
  if (!isReady) {
    throw new Error(
      `本地模型缺失（models/${modelId}.onnx）。请运行：npm run sync-matting`,
    )
  }

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

  const rembg = await ImportRembg()
  const session = await GetOrCreateSession(modelId, onProgress)

  try {
    return await rembg.remove(resized.blob, {
      session,
      postProcessMask: true,
      onProgress,
    })
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
