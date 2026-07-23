/**
 * 长图拼接 / 图片分割工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ImageJoin = () => import('@/views/imageJoin/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/image-join',
    name: 'ImageJoin',
    component: ImageJoin,
    meta: { title: '长图拼接' },
  },
]

export default routes
