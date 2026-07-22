/**
 * 文件转换工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const FileConverter = () => import('@/views/fileConverter/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/file-converter',
    name: 'FileConverter',
    component: FileConverter,
    meta: { title: '文件转换' },
  },
]

export default routes
