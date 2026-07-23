/**
 * Pages Functions：将 /api/* 同源转发到 fuse-pdf-api Worker（Service Binding）
 * 避免浏览器直连 *.workers.dev（国内常超时）
 */
type Env = {
  PDF_API?: Fetcher
}

/**
 * 处理所有 /api/* 请求
 * @param context Pages Function 上下文
 * @returns Worker 响应
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!context.env.PDF_API) {
    return new Response(
      JSON.stringify({
        error:
          '未配置 PDF_API Service Binding。请在 Pages → 设置 → 绑定 中添加服务绑定：PDF_API → fuse-pdf-api',
        needBinding: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    )
  }

  // 服务绑定在 Cloudflare 内网转发，不经过公网 workers.dev
  return context.env.PDF_API.fetch(context.request)
}
