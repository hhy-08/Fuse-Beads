/**
 * 像素图缩放器路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const PixelScaler = () => import('@/views/pixelScaler/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/pixel-scaler',
    name: 'PixelScaler',
    component: PixelScaler,
    meta: { title: '像素图缩放' },
  },
]

export default routes
