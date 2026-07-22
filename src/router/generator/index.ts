/**
 * 生成器页路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const Generator = () => import('@/views/generator/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/generator',
    name: 'Generator',
    component: Generator,
    meta: { title: '拼豆工具' },
  },
]

export default routes
