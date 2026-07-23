/**
 * 图纸尺寸计算器路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const BoardCalculator = () => import('@/views/boardCalculator/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/board-calculator',
    name: 'BoardCalculator',
    component: BoardCalculator,
    meta: { title: '图纸尺寸计算' },
  },
]

export default routes
