/**
 * 世界时钟路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const WorldClock = () => import('@/views/worldClock/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/world-clock',
    name: 'WorldClock',
    component: WorldClock,
    meta: { title: '世界时钟（各国时间）' },
  },
]

export default routes
