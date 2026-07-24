/**
 * Markdown 卡片生成工具模块
 * 将 Markdown 渲染为 HTML，并导出为分享用图片
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import html2canvas from 'html2canvas'

/** 卡片主题 ID */
export type MarkdownCardThemeId = 'ink' | 'night' | 'ocean' | 'forest'

/** 导出图片格式 */
export type MarkdownCardExportFormat = 'png' | 'jpeg'

/** 主题定义 */
export type MarkdownCardTheme = {
  id: MarkdownCardThemeId
  label: string
  description: string
  /** 舞台（卡片外）背景 */
  stageBg: string
  /** 卡片背景 */
  cardBg: string
  /** 正文色 */
  textColor: string
  /** 次要文字色 */
  mutedColor: string
  /** 强调色（标题下划线 / 引用条） */
  accentColor: string
  /** 代码块背景 */
  codeBg: string
  /** 代码文字色 */
  codeColor: string
  /** 边框 / 分隔线 */
  borderColor: string
  /** 链接色 */
  linkColor: string
}

/** 导出格式选项 */
export type MarkdownCardFormatOption = {
  value: MarkdownCardExportFormat
  label: string
  mime: string
  extension: string
  supportsQuality: boolean
}

/** 宽度选项 */
export type MarkdownCardWidthOption = {
  value: number
  label: string
}

const THEMES: MarkdownCardTheme[] = [
  {
    id: 'ink',
    label: '墨纸',
    description: '浅底深字，适合笔记与长文',
    stageBg: '#e8edf5',
    cardBg: '#fffcf7',
    textColor: '#1d2a44',
    mutedColor: '#5a6a84',
    accentColor: '#3d6bb3',
    codeBg: '#eef2f8',
    codeColor: '#243552',
    borderColor: 'rgba(29, 42, 68, 0.12)',
    linkColor: '#2f5fad',
  },
  {
    id: 'night',
    label: '夜码',
    description: '深色卡片，适合分享代码片段',
    stageBg: '#0f141f',
    cardBg: '#1a2333',
    textColor: '#e8eef8',
    mutedColor: '#9aabc4',
    accentColor: '#6ea3ff',
    codeBg: '#121925',
    codeColor: '#d4e2f7',
    borderColor: 'rgba(232, 238, 248, 0.12)',
    linkColor: '#8cbcff',
  },
  {
    id: 'ocean',
    label: '海雾',
    description: '蓝调渐变氛围，适合社交封面',
    stageBg: 'linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%)',
    cardBg: '#f4f7fb',
    textColor: '#1d2a44',
    mutedColor: '#5a6a84',
    accentColor: '#2f6fad',
    codeBg: '#e4ebf4',
    codeColor: '#243552',
    borderColor: 'rgba(29, 42, 68, 0.1)',
    linkColor: '#2f5fad',
  },
  {
    id: 'forest',
    label: '松青',
    description: '青绿点缀，适合清单与要点',
    stageBg: '#dce8e2',
    cardBg: '#f7fbf8',
    textColor: '#1a2e28',
    mutedColor: '#4d6a60',
    accentColor: '#2d7a5f',
    codeBg: '#e4f0ea',
    codeColor: '#1e3a32',
    borderColor: 'rgba(26, 46, 40, 0.12)',
    linkColor: '#2d7a5f',
  },
]

const FORMATOPTIONS: MarkdownCardFormatOption[] = [
  {
    value: 'png',
    label: 'PNG',
    mime: 'image/png',
    extension: 'png',
    supportsQuality: false,
  },
  {
    value: 'jpeg',
    label: 'JPEG',
    mime: 'image/jpeg',
    extension: 'jpg',
    supportsQuality: true,
  },
]

const WIDTHOPTIONS: MarkdownCardWidthOption[] = [
  { value: 480, label: '480 · 窄' },
  { value: 640, label: '640 · 常用' },
  { value: 720, label: '720 · 宽' },
  { value: 840, label: '840 · 超宽' },
]

/** 默认示例 Markdown */
export const DEFAULTMARKDOWN = `# Markdown 卡片

用几行 Markdown，生成适合分享的精美卡片。

## 适合场景

- 社交平台分享代码 / 笔记
- 周报要点一图流
- 学习笔记归档

## 代码示例

\`\`\`ts
function Hello(name: string) {
  return \`你好，\${name}!\`
}
\`\`\`

> 粘贴内容 → 选主题 → 导出图片

**Fuse Kit** · 本地处理，不上传服务器
`

/**
 * 获取卡片主题列表
 * @returns 主题数组
 */
export function GetMarkdownCardThemes(): MarkdownCardTheme[] {
  return THEMES
}

/**
 * 按 ID 解析主题，未知则回退墨纸
 * @param themeId 主题 ID
 * @returns 主题
 */
export function ResolveMarkdownCardTheme(
  themeId: MarkdownCardThemeId,
): MarkdownCardTheme {
  return THEMES.find((item) => item.id === themeId) || THEMES[0]
}

/**
 * 获取导出格式列表
 * @returns 格式选项
 */
export function GetMarkdownCardFormats(): MarkdownCardFormatOption[] {
  return FORMATOPTIONS
}

/**
 * 解析导出格式元信息
 * @param format 格式
 * @returns 元信息
 */
export function ResolveMarkdownCardFormat(
  format: MarkdownCardExportFormat,
): MarkdownCardFormatOption {
  return FORMATOPTIONS.find((item) => item.value === format) || FORMATOPTIONS[0]
}

/**
 * 获取卡片宽度选项
 * @returns 宽度选项
 */
export function GetMarkdownCardWidths(): MarkdownCardWidthOption[] {
  return WIDTHOPTIONS
}

/** 支持上传的 Markdown 扩展名 */
export const MARKDOWNCARDEXTENSIONS = ['md', 'markdown', 'mdown', 'mkd', 'txt'] as const

/** 上传文件大小上限（字节） */
export const MARKDOWNCARDMAXBYTES = 2 * 1024 * 1024

/**
 * 判断是否为可上传的 Markdown / 文本文件
 * @param file 文件
 * @returns 是否支持
 */
export function IsSupportedMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  if (dot < 0) {
    return false
  }
  const ext = name.slice(dot + 1)
  return (MARKDOWNCARDEXTENSIONS as readonly string[]).includes(ext)
}

/**
 * 读取 Markdown 文件文本（去除 UTF-8 BOM）
 * @param file 文件
 * @returns 文本内容
 */
export async function ReadMarkdownFileContent(file: File): Promise<string> {
  if (file.size > MARKDOWNCARDMAXBYTES) {
    throw new Error(
      `文件过大（>${(MARKDOWNCARDMAXBYTES / 1024 / 1024).toFixed(0)}MB），请拆分后上传`,
    )
  }
  if (!IsSupportedMarkdownFile(file)) {
    throw new Error('请上传 .md / .markdown / .txt 文件')
  }
  const text = await file.text()
  return text.replace(/^\uFEFF/, '')
}

/**
 * 将 Markdown 转为消毒后的 HTML
 * @param source Markdown 原文
 * @returns 安全 HTML
 */
export function RenderMarkdownToHtml(source: string): string {
  const raw = marked.parse(source || '', {
    async: false,
    gfm: true,
    breaks: true,
  }) as string
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  })
}

/**
 * 生成导出文件名
 * @param format 格式
 * @returns 文件名
 */
export function ResolveMarkdownCardFilename(
  format: MarkdownCardExportFormat,
): string {
  const meta = ResolveMarkdownCardFormat(format)
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  return `markdown-card-${stamp}.${meta.extension}`
}

/**
 * 触发浏览器下载 Blob
 * @param blob 文件数据
 * @param filename 文件名
 */
export function TriggerMarkdownCardDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * 将卡片 DOM 导出为图片 Blob
 * @param element 卡片根节点（含舞台背景）
 * @param format 导出格式
 * @param quality JPEG 质量 0~1
 * @param scale 像素倍率
 * @returns 图片 Blob
 */
export async function ExportMarkdownCardBlob(
  element: HTMLElement,
  format: MarkdownCardExportFormat = 'png',
  quality = 0.92,
  scale = 2,
): Promise<Blob> {
  const meta = ResolveMarkdownCardFormat(format)
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: Math.min(3, Math.max(1, scale)),
    useCORS: true,
    logging: false,
    // 避免把页面滚动条算进画布
    scrollX: 0,
    scrollY: 0,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出失败：无法生成图片'))
          return
        }
        resolve(blob)
      },
      meta.mime,
      meta.supportsQuality ? quality : undefined,
    )
  })
}
