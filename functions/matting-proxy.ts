/**
 * Cloudflare Pages：同源代理抠图大模型下载
 * 路径 /matting-proxy?id=isnet-general-use
 * 服务端拉取后流式返回，避免浏览器 CORS / 直连 HF 失败
 */

/** 与前端/Vite 代理一致的镜像 */
const MODELMIRRORS: Record<string, string[]> = {
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
 * 处理模型代理请求
 * @param context Pages Function 上下文
 * @returns 模型二进制流或错误响应
 */
export const onRequest: PagesFunction = async (context) => {
  const modelId = new URL(context.request.url).searchParams.get('id') || ''
  const mirrors = MODELMIRRORS[modelId]
  if (!mirrors?.length) {
    return new Response(`未知模型: ${modelId}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  let lastError: unknown = null
  for (const mirror of mirrors) {
    try {
      const upstream = await fetch(mirror, {
        redirect: 'follow',
        headers: { 'User-Agent': 'fuse-kit-matting-proxy' },
      })
      if (!upstream.ok || !upstream.body) {
        throw new Error(`HTTP ${upstream.status}`)
      }
      const headers = new Headers()
      headers.set('Content-Type', 'application/octet-stream')
      headers.set('Cache-Control', 'public, max-age=86400')
      const length = upstream.headers.get('content-length')
      if (length) {
        headers.set('Content-Length', length)
      }
      return new Response(upstream.body, { status: 200, headers })
    } catch (error) {
      lastError = error
    }
  }

  return new Response(
    `模型代理下载失败: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  )
}
