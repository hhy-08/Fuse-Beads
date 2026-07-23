/**
 * 文本对比工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const TextDiff = () => import('@/views/textDiff/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/text-diff',
    name: 'TextDiff',
    component: TextDiff,
    meta: { title: '文本对比' },
  },
]

export default routes
