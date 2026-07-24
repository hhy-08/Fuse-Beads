/**
 * Markdown 卡片生成工具路由配置
 */
import { RouteRecordRaw } from 'vue-router'

const MarkdownCard = () => import('@/views/markdownCard/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/markdown-card',
    name: 'MarkdownCard',
    component: MarkdownCard,
    meta: { title: 'Markdown 卡片生成' },
  },
]

export default routes
