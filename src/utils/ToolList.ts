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
      id: 'pixel',
      name: '像素画布',
      description: '自由手绘像素画，支持橡皮、取色、图层、网格，可导出像素图 / 拼豆图纸并对接拼豆生成器。',
      path: '/pixel-editor',
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
      id: 'unit',
      name: '单位转换',
      description: '长度、重量、面积、体积、温度换算，支持交换单位与转换记录。',
      path: '/unit-converter',
      available: true,
      badge: '可用',
    },
    {
      id: 'file',
      name: '文件转换',
      description: '同格式多文件批量转换：PDF→PNG/JPG/TXT，DOCX/XLSX/CSV/JSON 等本地处理。',
      path: '/file-converter',
      available: true,
      badge: '可用',
    },
    {
      id: 'qrcode',
      name: '二维码生成',
      description: '输入文字或链接生成二维码，支持自定义颜色、嵌入小图标与 PNG / JPEG / WebP 导出。',
      path: '/qrcode',
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
