/**
 * 工具列表页路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const Tools = () => import('@/views/tools/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Tools',
    component: Tools,
    meta: { title: '工具列表' },
  },
]

export default routes
