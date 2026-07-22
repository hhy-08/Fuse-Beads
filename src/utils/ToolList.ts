/**
 * 工具列表配置模块
 * 定义首页可进入的工具条目
 */

/** 工具条目 */
export type ToolItem = {
  id: string
  name: string
  description: string
  path: string
  available: boolean
  badge: string
}

/**
 * 获取工具列表
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
    },
    {
      id: 'compress',
      name: '图片压缩工具',
      description: '支持多图本地压缩，可调质量/缩放/宽高，结果可单下或打包 ZIP。',
      path: '/image-compress',
      available: true,
      badge: '可用',
    },
    {
      id: 'watermark',
      name: '图片水印工具',
      description: '多图批量加水印，支持九宫格位置、平铺、旋转、拖动与打包下载。',
      path: '/watermark',
      available: true,
      badge: '可用',
    },
    {
      id: 'converter',
      name: '图片格式转换',
      description: '多图转 JPEG / PNG / WebP / GIF，单张直下，多张打包 ZIP。',
      path: '/image-converter',
      available: true,
      badge: '可用',
    },
    {
      id: 'palette',
      name: '色卡对照',
      description: '浏览 MARD 色号与色值对照，方便备料与核对。',
      path: '',
      available: false,
      badge: '即将推出',
    },
  ]
}
