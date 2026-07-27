/**
 * 将 AI 抠图 ONNX 模型拉取到 public/models
 * 默认从 GitHub Releases 下载（安装期走服务端网络，避开浏览器访问 HuggingFace 超时）
 * ORT WASM 由 Vite ?url 从 node_modules 打包（经典 threaded.wasm，非 jsep）
 * 生产构建默认 --light：仅预置 u2netp（≤25MiB），大模型由浏览器按需下载（Cloudflare Pages 限制）
 *
 * 用法：
 *   node scripts/FetchMattingModels.mjs           # 全部模型（本地预热，勿直接用于 Pages 出包）
 *   node scripts/FetchMattingModels.mjs --light   # 仅 u2netp（Pages / CI 推荐）
 *   node scripts/FetchMattingModels.mjs --poster  # 轻量 + 海报推荐 isnet-anime
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const targetDir = join(rootDir, 'public', 'models')

/** 模型清单：文件名 → 下载地址与大致体积（字节，用于跳过已存在完整文件） */
const MODELLIST = [
  {
    id: 'u2netp',
    fileName: 'u2netp.onnx',
    urls: [
      'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/u2netp.onnx?download=true',
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
    ],
    minBytes: 4 * 1024 * 1024,
    group: 'light',
  },
  {
    id: 'silueta',
    fileName: 'silueta.onnx',
    urls: [
      'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/silueta.onnx?download=true',
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
    ],
    minBytes: 40 * 1024 * 1024,
    group: 'detail',
  },
  {
    id: 'isnet-anime',
    fileName: 'isnet-anime.onnx',
    urls: [
      'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-anime.onnx?download=true',
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx',
    ],
    minBytes: 160 * 1024 * 1024,
    group: 'poster',
  },
  {
    id: 'isnet-general-use',
    fileName: 'isnet-general-use.onnx',
    urls: [
      'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-general-use.onnx?download=true',
      'https://hf-mirror.com/SacredNoir/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx?download=true',
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
    ],
    minBytes: 160 * 1024 * 1024,
    group: 'detail',
  },
]

/**
 * 下载单个模型文件（多镜像按序尝试）
 * @param item 模型项
 * @param force 是否强制重下
 */
async function DownloadModel(item, force = false) {
  const targetPath = join(targetDir, item.fileName)
  if (!force && existsSync(targetPath)) {
    const size = statSync(targetPath).size
    if (size >= item.minBytes) {
      console.log(
        `[FetchMattingModels] 已存在 ${item.fileName} (${(size / 1024 / 1024).toFixed(2)}MB)，跳过`,
      )
      return
    }
  }

  mkdirSync(targetDir, { recursive: true })
  const urls = item.urls || (item.url ? [item.url] : [])
  let lastError = null
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i]
    try {
      console.log(
        `[FetchMattingModels] 下载 ${item.fileName}（镜像 ${i + 1}/${urls.length}）…`,
      )
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'utility-toolbox-matting-fetch' },
      })
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }
      await pipeline(response.body, createWriteStream(targetPath))
      const size = statSync(targetPath).size
      if (size < item.minBytes) {
        throw new Error(`文件过小 ${(size / 1024 / 1024).toFixed(2)}MB`)
      }
      console.log(
        `[FetchMattingModels] 完成 ${item.fileName} (${(size / 1024 / 1024).toFixed(2)}MB)`,
      )
      return
    } catch (error) {
      lastError = error
      console.warn(
        `[FetchMattingModels] 镜像失败: ${error instanceof Error ? error.message : error}`,
      )
    }
  }
  throw new Error(
    `下载失败 ${item.fileName}: ${lastError instanceof Error ? lastError.message : lastError}`,
  )
}

const force = process.argv.includes('--force')
const onlyLight = process.argv.includes('--light')
const onlyPoster = process.argv.includes('--poster')

try {
  mkdirSync(targetDir, { recursive: true })
  let list = MODELLIST
  if (onlyLight) {
    list = MODELLIST.filter((item) => item.group === 'light')
  } else if (onlyPoster) {
    list = MODELLIST.filter(
      (item) => item.group === 'light' || item.group === 'poster',
    )
  }
  for (const item of list) {
    await DownloadModel(item, force)
  }
  console.log('[FetchMattingModels] 模型就绪（ORT 由 Vite 从 node_modules 打包）')
} catch (error) {
  console.error('[FetchMattingModels] 失败:', error)
  process.exitCode = 1
}
