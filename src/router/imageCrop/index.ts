/**
 * 图片裁剪工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageCrop = () => import('@/views/imageCrop/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-crop',
    name: 'ImageCrop',
    component: ImageCrop,
    meta: { title: '图片裁剪' },
  },
]

export default routes
