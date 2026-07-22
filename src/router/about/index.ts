/**
 * 关于页路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const About = () => import('@/views/about/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: { title: '关于' },
  },
]

export default routes
