/**
 * Vite 插件：构建结束后剔除 dist 中超过 Cloudflare Pages 单文件上限的资源
 * Pages 限制：单个文件 ≤ 25 MiB；大模型改由运行时按需下载
 */
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

/** Cloudflare Pages 单文件上限（字节） */
const MAXASSETBYTES = 25 * 1024 * 1024

/**
 * 递归收集目录下所有文件路径
 * @param dir 目录
 * @returns 文件路径列表
 */
function CollectFiles(dir) {
  const results = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, name.name)
    if (name.isDirectory()) {
      results.push(...CollectFiles(fullPath))
    } else if (name.isFile()) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * 创建剔除超限静态资源的 Vite 插件
 * @returns Vite Plugin
 */
export function CreateStripOversizedAssetsPlugin() {
  let outDir = 'dist'

  return {
    name: 'strip-oversized-assets',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir || 'dist'
    },
    /**
     * 关闭 bundle 后扫描并删除超限文件
     */
    closeBundle() {
      const root = join(process.cwd(), outDir)
      let removed = 0
      for (const filePath of CollectFiles(root)) {
        const size = statSync(filePath).size
        if (size <= MAXASSETBYTES) {
          continue
        }
        unlinkSync(filePath)
        removed += 1
        console.warn(
          `[StripOversizedAssets] 已剔除 ${(size / 1024 / 1024).toFixed(2)}MiB → ${filePath.replace(process.cwd(), '.')}`,
        )
      }
      if (removed > 0) {
        console.warn(
          `[StripOversizedAssets] 共剔除 ${removed} 个超限文件（Cloudflare Pages ≤25MiB）；大模型请运行时下载`,
        )
      }
    },
  }
}
