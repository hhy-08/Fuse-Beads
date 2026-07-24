/**
 * JSON 格式化工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const JsonFormatter = () => import('@/views/jsonFormatter/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/json-formatter',
    name: 'JsonFormatter',
    component: JsonFormatter,
    meta: { title: 'JSON 格式化' },
  },
]

export default routes
