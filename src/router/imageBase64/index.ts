/**
 * 图片 ↔ Base64 互转工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageBase64 = () => import('@/views/imageBase64/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-base64',
    name: 'ImageBase64',
    component: ImageBase64,
    meta: { title: '图片 ↔ Base64' },
  },
]

export default routes
