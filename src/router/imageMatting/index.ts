/**
 * AI 智能抠图工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageMatting = () => import('@/views/imageMatting/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-matting',
    name: 'ImageMatting',
    component: ImageMatting,
    meta: { title: 'AI 智能抠图' },
  },
]

export default routes
