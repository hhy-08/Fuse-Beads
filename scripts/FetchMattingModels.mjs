/**
 * 将 AI 抠图 ONNX 模型拉取到 public/models
 * 默认从 GitHub Releases 下载（安装期走服务端网络，避开浏览器访问 HuggingFace 超时）
 * ORT WASM 由 Vite ?url 从 node_modules 打包，无需再同步到 public/ort
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
    fileName: 'u2netp.onnx',
    url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
    minBytes: 4 * 1024 * 1024,
  },
  {
    fileName: 'silueta.onnx',
    url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
    minBytes: 40 * 1024 * 1024,
  },
]

/**
 * 下载单个模型文件
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

  console.log(`[FetchMattingModels] 下载 ${item.fileName} …`)
  const response = await fetch(item.url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'fuse-kit-matting-fetch' },
  })
  if (!response.ok || !response.body) {
    throw new Error(`下载失败 ${item.fileName}: HTTP ${response.status}`)
  }

  mkdirSync(targetDir, { recursive: true })
  await pipeline(response.body, createWriteStream(targetPath))
  const size = statSync(targetPath).size
  console.log(
    `[FetchMattingModels] 完成 ${item.fileName} (${(size / 1024 / 1024).toFixed(2)}MB)`,
  )
}

const force = process.argv.includes('--force')
const onlyLight = process.argv.includes('--light')

try {
  mkdirSync(targetDir, { recursive: true })
  const list = onlyLight
    ? MODELLIST.filter((item) => item.fileName === 'u2netp.onnx')
    : MODELLIST
  for (const item of list) {
    await DownloadModel(item, force)
  }
  console.log('[FetchMattingModels] 模型就绪（ORT 由 Vite 从 node_modules 打包）')
} catch (error) {
  console.error('[FetchMattingModels] 失败:', error)
  process.exitCode = 1
}
