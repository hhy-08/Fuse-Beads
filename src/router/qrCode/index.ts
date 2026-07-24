/**
 * 二维码生成器路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const QrCode = () => import('@/views/qrCode/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/qrcode',
    name: 'QrCode',
    component: QrCode,
    meta: { title: '二维码工具' },
  },
]

export default routes
