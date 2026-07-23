/**
 * 拼豆配色模拟器路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const PaletteSimulator = () => import('@/views/paletteSimulator/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/palette-simulator',
    name: 'PaletteSimulator',
    component: PaletteSimulator,
    meta: { title: '配色模拟' },
  },
]

export default routes
