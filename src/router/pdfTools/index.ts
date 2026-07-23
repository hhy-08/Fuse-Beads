/**
 * PDF 工具站路由
 */
import type { RouteRecordRaw } from 'vue-router'

const PdfToolsHome = () => import('@/views/pdfTools/index.vue')
const PdfToolPage = () => import('@/views/pdfTools/tool.vue')

export default [
  {
    path: '/pdf-tools',
    name: 'PdfTools',
    component: PdfToolsHome,
    meta: { title: 'PDF 工具站' },
  },
  {
    path: '/pdf-tools/:toolId',
    name: 'PdfToolPage',
    component: PdfToolPage,
    meta: { title: 'PDF 工具' },
  },
] as RouteRecordRaw[]
