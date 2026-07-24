/**
 * 工具列表配置模块
 * 按类型分组定义首页可进入的工具条目
 */

/** 工具分类 ID */
export type ToolCategoryId = 'beads' | 'image' | 'office' | 'life'

/** 工具分类 */
export type ToolCategory = {
  id: ToolCategoryId
  name: string
  description: string
}

/** 工具条目 */
export type ToolItem = {
  id: string
  name: string
  description: string
  path: string
  available: boolean
  badge: string
  category: ToolCategoryId
}

/** 分组后的工具区块 */
export type ToolGroup = {
  category: ToolCategory
  tools: ToolItem[]
}

/**
 * 获取工具分类定义（展示顺序）
 * @returns 分类列表
 */
export function GetToolCategories(): ToolCategory[] {
  return [
    {
      id: 'beads',
      name: '拼豆配套工具',
      description: '图纸生成、像素绘制与素材预处理，服务拼豆创作全流程。',
    },
    {
      id: 'image',
      name: '图片类工具',
      description: '裁剪、拼接、压缩、水印、AI 抠图、格式转换等常见图片处理。',
    },
    {
      id: 'office',
      name: '文本 / 日常办公小工具',
      description: 'PDF 工具站、JSON 格式化、文本对比、文件转换、二维码等办公效率工具。',
    },
    {
      id: 'life',
      name: '趣味 & 生活实用工具',
      description: '单位换算、拾色器、时间戳转换、世界时钟等轻量实用小工具，随用随开。',
    },
  ]
}

/**
 * 获取全部工具列表（扁平）
 * @returns 工具条目数组
 */
export function GetToolList(): ToolItem[] {
  return [
    {
      id: 'beads',
      name: '拼豆工具',
      description: '文字或图片一键生成可打印的拼豆像素图纸，支持 MARD 色卡与 PNG 导出。',
      path: '/generator',
      available: true,
      badge: '可用',
      category: 'beads',
    },
    {
      id: 'pixel',
      name: '像素画布',
      description: '自由手绘像素画，支持橡皮、取色、图层、网格，可导出像素图 / 拼豆图纸并对接拼豆生成器。',
      path: '/pixel-editor',
      available: true,
      badge: '可用',
      category: 'beads',
    },
    {
      id: 'pixel-scaler',
      name: '像素图缩放',
      description: '最近邻插值无损放大像素图，避免普通放大模糊，适合拼豆素材预处理。',
      path: '/pixel-scaler',
      available: true,
      badge: '可用',
      category: 'beads',
    },
    {
      id: 'palette-sim',
      name: '配色模拟',
      description: '输入多个 MARD 色号实时预览搭配效果，支持保存配色方案到本地。',
      path: '/palette-simulator',
      available: true,
      badge: '可用',
      category: 'beads',
    },
    {
      id: 'board-calc',
      name: '图纸尺寸计算',
      description: '输入图案宽高估算拼豆板规格与豆子总数，上传图纸可统计各色备料用量。',
      path: '/board-calculator',
      available: true,
      badge: '可用',
      category: 'beads',
    },
    {
      id: 'palette',
      name: '色卡对照',
      description: '浏览 MARD 色号与色值对照，方便备料与核对。',
      path: '',
      available: false,
      badge: '即将推出',
      category: 'beads',
    },
    {
      id: 'crop',
      name: '图片裁剪',
      description: '固定比例、圆形与圆角裁切，适合头像与素材预处理，可送入拼豆生成器。',
      path: '/image-crop',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'matting',
      name: 'AI 智能抠图',
      description:
        '浏览器本地去背景；默认轻量模型，其它档位选中后自动下载，导出透明 PNG。',
      path: '/image-matting',
      available: true,
      badge: '新',
      category: 'image',
    },
    {
      id: 'join',
      name: '长图拼接 / 分割',
      description: '多张图竖向拼成长图，或将大图按行列均等切成小图并打包下载。',
      path: '/image-join',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'compress',
      name: '图片压缩工具',
      description: '支持多图本地压缩，可调质量/缩放/宽高，结果可单下或打包 ZIP。',
      path: '/image-compress',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'watermark',
      name: '图片 / 文本水印',
      description:
        '图片与 txt / docx 等文本加水印，支持九宫格、平铺、旋转、拖动与打包下载。',
      path: '/watermark',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'converter',
      name: '图片格式转换',
      description: '多图转 JPEG / PNG / WebP / GIF，单张直下，多张打包 ZIP。',
      path: '/image-converter',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'image-to-ico',
      name: '图片转 ICO',
      description: '将图片转为多尺寸 ICO 图标（16~256），支持完整放入 / 铺满裁切，本地下载。',
      path: '/image-to-ico',
      available: true,
      badge: '可用',
      category: 'image',
    },
    {
      id: 'pdf-tools',
      name: 'PDF 工具站',
      description:
        '合并 / 拆分 / 旋转 / 水印 / 加密，Word↔PDF（Cloudflare Containers），卡片式入口。',
      path: '/pdf-tools',
      available: true,
      badge: '新',
      category: 'office',
    },
    {
      id: 'file',
      name: '文件转换',
      description: '同格式多文件批量转换：PDF→PNG/JPG/TXT，DOCX/XLSX/CSV/JSON 等本地处理。',
      path: '/file-converter',
      available: true,
      badge: '可用',
      category: 'office',
    },
    {
      id: 'text-diff',
      name: '文本对比',
      description: '两段文字差异高亮，支持粘贴或上传 txt / json / vue / js / ts 等文本文件，适合校对与代码对比。',
      path: '/text-diff',
      available: true,
      badge: '可用',
      category: 'office',
    },
    {
      id: 'json-formatter',
      name: 'JSON 格式化',
      description:
        '校验、美化、压缩 JSON；支持 stringify 转义与树形展开，解析失败可本地 AI 修复。',
      path: '/json-formatter',
      available: true,
      badge: '新',
      category: 'office',
    },
    {
      id: 'qrcode',
      name: '二维码生成',
      description: '输入文字或链接生成二维码，支持自定义颜色、嵌入小图标与 PNG / JPEG / WebP 导出。',
      path: '/qrcode',
      available: true,
      badge: '可用',
      category: 'office',
    },
    {
      id: 'unit',
      name: '单位转换',
      description: '长度、重量、面积、体积、温度换算，支持交换单位与转换记录。',
      path: '/unit-converter',
      available: true,
      badge: '可用',
      category: 'life',
    },
    {
      id: 'color-picker',
      name: '拾色器（色值转换）',
      description: '屏幕取色，HEX / RGB / HSL / 透明度互相转换，支持自定义调色。',
      path: '/color-picker',
      available: true,
      badge: '新',
      category: 'life',
    },
    {
      id: 'timestamp-converter',
      name: '时间戳转换',
      description:
        '秒 / 毫秒时间戳与北京时间互相转换，支持非洲等多时区、批量转换与复制记录。',
      path: '/timestamp-converter',
      available: true,
      badge: '新',
      category: 'life',
    },
    {
      id: 'world-clock',
      name: '世界时钟（各国时间）',
      description: '实时查看各国当前时间，支持按大洲筛选、搜索与收藏常用城市。',
      path: '/world-clock',
      available: true,
      badge: '新',
      category: 'life',
    },
  ]
}

/**
 * 按分类分组获取工具列表（空分类不返回）
 * @returns 分组列表
 */
export function GetGroupedToolList(): ToolGroup[] {
  const tools = GetToolList()
  return GetToolCategories()
    .map((category) => ({
      category,
      tools: tools.filter((tool) => tool.category === category.id),
    }))
    .filter((group) => group.tools.length > 0)
}
