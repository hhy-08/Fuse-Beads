/**
 * 图片格式转换工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageConverter = () => import('@/views/imageConverter/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-converter',
    name: 'ImageConverter',
    component: ImageConverter,
    meta: { title: '图片格式转换' },
  },
]

export default routes
