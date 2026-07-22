/**
 * 生成器页路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const Generator = () => import('@/views/generator/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Generator',
    component: Generator,
    meta: { title: '图纸生成' },
  },
  {
    path: '/generator',
    redirect: '/',
  },
]

export default routes
