/**
 * 像素画布编辑器路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const PixelEditor = () => import('@/views/pixelEditor/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/pixel-editor',
    name: 'PixelEditor',
    component: PixelEditor,
    meta: { title: '像素画布' },
  },
]

export default routes
