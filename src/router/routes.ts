/**
 * 路由表聚合入口
 * 参考 ilot：自动收集各业务目录下的路由配置
 */
import { RouteRecordRaw } from 'vue-router'

let routes: RouteRecordRaw[] = []
const matches = import.meta.glob('./*/*.ts', { eager: true }) as Record<
  string,
  { default: RouteRecordRaw[] }
>

for (const key in matches) {
  routes = routes.concat(matches[key].default)
}

export default routes
