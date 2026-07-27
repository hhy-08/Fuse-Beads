/**
 * Vite 开发态同源代理：/matting-proxy?id=xxx → 服务端拉取 ONNX
 * 解决浏览器直连 GitHub/HF 的 CORS 与国内访问问题
 */
import { Readable } from 'node:stream'

/** 与前端一致的镜像列表（服务端无 CORS 限制） */
const MODELMIRRORS = {
  u2netp: [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/u2netp.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
  ],
  silueta: [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/silueta.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
  ],
  'isnet-anime': [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-anime.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx',
  ],
  'isnet-general-use': [
    'https://hf-mirror.com/tomjackson2023/rembg/resolve/main/isnet-general-use.onnx?download=true',
    'https://hf-mirror.com/SacredNoir/isnet-general-use-onnx/resolve/main/isnet-general-use.onnx?download=true',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
  ],
}

/**
 * 创建抠图模型代理插件
 * @returns Vite 插件
 */
export function CreateMattingProxyPlugin() {
  return {
    name: 'matting-model-proxy',
    /**
     * 注册开发服务器中间件
     * @param server ViteDevServer
     */
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url || ''
          if (!rawUrl.startsWith('/matting-proxy')) {
            next()
            return
          }

          const parsed = new URL(rawUrl, 'http://127.0.0.1')
          const modelId = parsed.searchParams.get('id') || ''
          const mirrors = MODELMIRRORS[modelId]
          if (!mirrors?.length) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(`未知模型: ${modelId}`)
            return
          }

          let lastError = null
          for (let i = 0; i < mirrors.length; i += 1) {
            const mirror = mirrors[i]
            try {
              const upstream = await fetch(mirror, {
                redirect: 'follow',
                headers: { 'User-Agent': 'utility-toolbox-matting-proxy' },
              })
              if (!upstream.ok || !upstream.body) {
                throw new Error(`HTTP ${upstream.status}`)
              }
              const length = upstream.headers.get('content-length')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/octet-stream')
              res.setHeader('Cache-Control', 'public, max-age=86400')
              if (length) {
                res.setHeader('Content-Length', length)
              }
              Readable.fromWeb(upstream.body).pipe(res)
              return
            } catch (error) {
              lastError = error
            }
          }

          res.statusCode = 502
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(
            `模型代理下载失败: ${
              lastError instanceof Error ? lastError.message : String(lastError)
            }`,
          )
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
