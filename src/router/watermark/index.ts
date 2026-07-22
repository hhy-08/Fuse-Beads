/**
 * 图片水印工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const Watermark = () => import('@/views/watermark/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/watermark',
    name: 'Watermark',
    component: Watermark,
    meta: { title: '图片水印' },
  },
]

export default routes
