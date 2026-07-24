/**
 * 拾色器工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const ColorPicker = () => import('@/views/colorPicker/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/color-picker',
    name: 'ColorPicker',
    component: ColorPicker,
    meta: { title: '拾色器（色值转换）' },
  },
]

export default routes
