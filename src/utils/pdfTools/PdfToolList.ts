/**
 * PDF 工具站 —— 工具卡片配置
 * 对齐 iLovePDF 类产品信息架构；available=true 为已实现
 */

/** 工具分类 */
export type PdfToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert'
  | 'edit'
  | 'security'

/** 单个 PDF 工具 */
export type PdfToolItem = {
  id: string
  name: string
  description: string
  category: PdfToolCategory
  available: boolean
  /** 后端路径（本地工具可为空） */
  endpoint?: string
  accept: string
  multiple: boolean
  minFiles: number
  /** 额外表单字段 */
  fields?: Array<'angle' | 'text' | 'opacity' | 'password'>
  /** 纯前端本地处理标识 */
  localMode?: 'pdf-to-jpg' | 'pdf-watermark'
  badge: string
}

/** 分类展示 */
export type PdfToolCategoryMeta = {
  id: PdfToolCategory | 'all'
  name: string
}

/**
 * 获取分类筛选项
 * @returns 分类列表
 */
export function GetPdfToolCategories(): PdfToolCategoryMeta[] {
  return [
    { id: 'all', name: '全部' },
    { id: 'organize', name: '整理 PDF' },
    { id: 'optimize', name: '优化 PDF' },
    { id: 'convert', name: 'PDF 转换' },
    { id: 'edit', name: '编辑 PDF' },
    { id: 'security', name: 'PDF 安全' },
  ]
}

/**
 * 获取全部 PDF 工具定义
 * @returns 工具列表
 */
export function GetPdfToolList(): PdfToolItem[] {
  return [
    {
      id: 'merge',
      name: '合并 PDF',
      description: '将多个 PDF 文件按顺序合并为一个。',
      category: 'organize',
      available: true,
      endpoint: '/api/pdf/merge',
      accept: '.pdf,application/pdf',
      multiple: true,
      minFiles: 2,
      badge: '可用',
    },
    {
      id: 'split',
      name: '拆分 PDF',
      description: '将 PDF 按页拆成多个文件，多页打包 ZIP。',
      category: 'organize',
      available: true,
      endpoint: '/api/pdf/split',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '可用',
    },
    {
      id: 'rotate',
      name: '旋转 PDF',
      description: '将每一页旋转 90° / 180° / 270°。',
      category: 'organize',
      available: true,
      endpoint: '/api/pdf/rotate',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      fields: ['angle'],
      badge: '可用',
    },
    {
      id: 'compress',
      name: '压缩 PDF',
      description: '减小 PDF 体积，尽量保持清晰度。',
      category: 'optimize',
      available: false,
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '即将推出',
    },
    {
      id: 'word-to-pdf',
      name: 'Word 转 PDF',
      description:
        'DOC / DOCX 转为 PDF（需 Docker 部署 Containers 完整版后可用）。',
      category: 'convert',
      available: false,
      endpoint: '/api/convert/docx-to-pdf',
      accept:
        '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      multiple: false,
      minFiles: 1,
      badge: '需 Containers',
    },
    {
      id: 'pdf-to-word',
      name: 'PDF 转 Word',
      description: 'PDF 转为 DOCX（需 Docker 部署 Containers 完整版后可用）。',
      category: 'convert',
      available: false,
      endpoint: '/api/convert/pdf-to-docx',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '需 Containers',
    },
    {
      id: 'jpg-to-pdf',
      name: 'JPG 转 PDF',
      description: '将多张 JPG / PNG 合成一个 PDF。',
      category: 'convert',
      available: true,
      endpoint: '/api/pdf/images-to-pdf',
      accept: '.jpg,.jpeg,.png,image/jpeg,image/png',
      multiple: true,
      minFiles: 1,
      badge: '可用',
    },
    {
      id: 'pdf-to-jpg',
      name: 'PDF 转 JPG',
      description: '将 PDF 每一页导出为 JPG（浏览器本地渲染，不上传）。',
      category: 'convert',
      available: true,
      localMode: 'pdf-to-jpg',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '本地',
    },
    {
      id: 'excel-to-pdf',
      name: 'Excel 转 PDF',
      description: 'XLS / XLSX 转为 PDF。',
      category: 'convert',
      available: false,
      accept: '.xls,.xlsx',
      multiple: false,
      minFiles: 1,
      badge: '即将推出',
    },
    {
      id: 'ppt-to-pdf',
      name: 'PowerPoint 转 PDF',
      description: 'PPT / PPTX 转为 PDF。',
      category: 'convert',
      available: false,
      accept: '.ppt,.pptx',
      multiple: false,
      minFiles: 1,
      badge: '即将推出',
    },
    {
      id: 'watermark',
      name: 'PDF 水印',
      description:
        '文字水印（支持中文）：字号、颜色、旋转、九宫格与平铺，浏览器本地处理。',
      category: 'edit',
      available: true,
      localMode: 'pdf-watermark',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '本地',
    },
    {
      id: 'protect',
      name: 'PDF 加密',
      description: '密码保护 PDF（需 Docker 部署 Containers 完整版后可用）。',
      category: 'security',
      available: false,
      endpoint: '/api/pdf/protect',
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      fields: ['password'],
      badge: '需 Containers',
    },
    {
      id: 'unlock',
      name: 'PDF 解锁',
      description: '移除 PDF 打开密码（需提供正确密码）。',
      category: 'security',
      available: false,
      accept: '.pdf,application/pdf',
      multiple: false,
      minFiles: 1,
      badge: '即将推出',
    },
  ]
}

/**
 * 按 ID 查找工具
 * @param id 工具 ID
 * @returns 工具或 undefined
 */
export function FindPdfToolById(id: string): PdfToolItem | undefined {
  return GetPdfToolList().find((item) => item.id === id)
}

/**
 * 按分类过滤工具
 * @param category 分类，all 表示全部
 * @returns 过滤后的列表
 */
export function FilterPdfTools(
  category: PdfToolCategory | 'all',
): PdfToolItem[] {
  const list = GetPdfToolList()
  if (category === 'all') return list
  return list.filter((item) => item.category === category)
}
