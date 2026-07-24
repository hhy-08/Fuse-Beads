/**
 * 时间戳转换工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const TimestampConverter = () => import('@/views/timestampConverter/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/timestamp-converter',
    name: 'TimestampConverter',
    component: TimestampConverter,
    meta: { title: '时间戳转换' },
  },
]

export default routes
