/**
 * SVG 转图片工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const SvgToImage = () => import('@/views/svgToImage/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/svg-to-image',
    name: 'SvgToImage',
    component: SvgToImage,
    meta: { title: 'SVG / 图片互转' },
  },
]

export default routes
