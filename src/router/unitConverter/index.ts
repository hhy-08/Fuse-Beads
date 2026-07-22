/**
 * 单位转换工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const UnitConverter = () => import('@/views/unitConverter/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/unit-converter',
    name: 'UnitConverter',
    component: UnitConverter,
    meta: { title: '单位转换' },
  },
]

export default routes
