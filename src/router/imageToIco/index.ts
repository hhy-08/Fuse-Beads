/**
 * 图片转 ICO 工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageToIco = () => import('@/views/imageToIco/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-to-ico',
    name: 'ImageToIco',
    component: ImageToIco,
    meta: { title: '图片转 ICO' },
  },
]

export default routes
