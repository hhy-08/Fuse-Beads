/**
 * 将 pdfjs-dist 的 cmaps / standard_fonts 同步到 public/pdfjs
 * 供浏览器本地加载，修复中文 CID 字体空白
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(rootDir, 'node_modules', 'pdfjs-dist')
const targetRoot = join(rootDir, 'public', 'pdfjs')

/**
 * 同步单个资源目录
 * @param folderName 目录名
 */
function SyncFolder(folderName) {
  const fromPath = join(sourceRoot, folderName)
  const toPath = join(targetRoot, folderName)
  if (!existsSync(fromPath)) {
    console.warn(`[SyncPdfjsAssets] 未找到 ${fromPath}，跳过`)
    return
  }
  rmSync(toPath, { recursive: true, force: true })
  mkdirSync(targetRoot, { recursive: true })
  cpSync(fromPath, toPath, { recursive: true })
  console.log(`[SyncPdfjsAssets] 已同步 ${folderName}`)
}

SyncFolder('cmaps')
SyncFolder('standard_fonts')
