/**
 * Fuse PDF API —— 完整入口（Workers + Containers）
 * 需 Docker：npm run deploy:full
 */
import { LibreOfficeContainer } from './LibreOfficeContainer'
import worker, { HandleApi } from './index'
import type { Env } from './http'

export { LibreOfficeContainer, HandleApi }

export default {
  /**
   * 完整版 Worker fetch（与 Worker-only 相同路由，但绑定了 LIBRE_OFFICE）
   * @param request 请求
   * @param env 环境
   * @returns Response
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    return worker.fetch(request, env)
  },
}
