/**
 * 图片压缩工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageCompress = () => import('@/views/imageCompress/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-compress',
    name: 'ImageCompress',
    component: ImageCompress,
    meta: { title: '图片压缩' },
  },
]

export default routes
