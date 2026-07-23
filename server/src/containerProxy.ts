/**
 * 转发请求到 LibreOffice / qpdf 容器
 */
import { getContainer } from '@cloudflare/containers'
import {
  FileResponse,
  HasLibreOffice,
  JsonResponse,
  type Env,
} from './http'

/**
 * 获取已启动的 LibreOffice 容器 stub
 * @param env 环境
 * @returns 容器 stub
 */
async function GetConverterContainer(env: Env) {
  if (!env.LIBRE_OFFICE) {
    throw new Error('LIBRE_OFFICE 绑定不存在')
  }
  const container = getContainer(env.LIBRE_OFFICE, 'converter-pool-0')
  await container.startAndWaitForPorts()
  return container
}

/**
 * 转发到 LibreOffice / qpdf 容器
 * @param env 环境
 * @param request 原始请求（CORS）
 * @param file 上传文件
 * @param containerPath 容器路径（含 query）
 * @param fallbackName 默认文件名
 * @param mime MIME
 * @returns Response
 */
export async function ProxyToContainer(
  env: Env,
  request: Request,
  file: File,
  containerPath: string,
  fallbackName: string,
  mime: string,
): Promise<Response> {
  if (!HasLibreOffice(env)) {
    return JsonResponse(request, env, 503, {
      error: 'Containers 未启用',
      needContainers: true,
    })
  }

  const container = await GetConverterContainer(env)
  const form = new FormData()
  form.append('file', file, file.name)

  const containerRes = await container.fetch(
    new Request(`http://container${containerPath}`, {
      method: 'POST',
      body: form,
    }),
  )

  if (!containerRes.ok) {
    const text = await containerRes.text()
    let message = text
    try {
      message = (JSON.parse(text) as { error?: string }).error || text
    } catch {
      /* ignore */
    }
    return JsonResponse(request, env, containerRes.status || 500, {
      error: message || '容器处理失败',
    })
  }

  const outBytes = new Uint8Array(await containerRes.arrayBuffer())
  const outName =
    decodeURIComponent(containerRes.headers.get('X-Converted-Name') || '') ||
    fallbackName
  return FileResponse(request, env, outBytes, outName, mime)
}
