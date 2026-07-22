/**
 * 拼豆文字采样可选字体列表
 * 优先选择笔画清晰、适合像素化的中英文字体
 */

/** 单个可选字体项 */
export type FontOption = {
  id: string
  label: string
  /** Canvas font-family 片段（含引号与回退） */
  family: string
  /** 预览用 CSS font-family */
  previewFamily: string
}

/** 默认字体 ID */
export const DEFAULTFONTID = 'noto-sans-sc'

/** 可选字体清单 */
export const FONTOPTIONS: FontOption[] = [
  {
    id: 'noto-sans-sc',
    label: 'Noto 黑体',
    family: '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", sans-serif',
    previewFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
  },
  {
    id: 'noto-serif-sc',
    label: 'Noto 宋体',
    family: '"Noto Serif SC", "Songti SC", serif',
    previewFamily: '"Noto Serif SC", "Songti SC", serif',
  },
  {
    id: 'zcool-kuaile',
    label: '站酷快乐体',
    family: '"ZCOOL KuaiLe", "PingFang SC", cursive',
    previewFamily: '"ZCOOL KuaiLe", cursive',
  },
  {
    id: 'zcool-qingke',
    label: '站酷庆科黄油体',
    family: '"ZCOOL QingKe HuangYou", "PingFang SC", cursive',
    previewFamily: '"ZCOOL QingKe HuangYou", cursive',
  },
  {
    id: 'ma-shan-zheng',
    label: '马善政毛笔',
    family: '"Ma Shan Zheng", "Kaiti SC", cursive',
    previewFamily: '"Ma Shan Zheng", cursive',
  },
  {
    id: 'zhi-mang-xing',
    label: '芝麻行书',
    family: '"Zhi Mang Xing", "Kaiti SC", cursive',
    previewFamily: '"Zhi Mang Xing", cursive',
  },
  {
    id: 'long-cang',
    label: '龙藏体',
    family: '"Long Cang", "Kaiti SC", cursive',
    previewFamily: '"Long Cang", cursive',
  },
  {
    id: 'liu-jian-mao-cao',
    label: '刘建毛草',
    family: '"Liu Jian Mao Cao", "Kaiti SC", cursive',
    previewFamily: '"Liu Jian Mao Cao", cursive',
  },
  {
    id: 'press-start',
    label: 'Press Start 像素',
    family: '"Press Start 2P", "Noto Sans SC", monospace',
    previewFamily: '"Press Start 2P", monospace',
  },
  {
    id: 'rubik-mono',
    label: 'Rubik Mono',
    family: '"Rubik Mono One", "Noto Sans SC", sans-serif',
    previewFamily: '"Rubik Mono One", sans-serif',
  },
]

/**
 * 根据字体 ID 查找配置
 * @param id 字体 ID
 * @returns 字体配置，找不到则返回默认项
 */
export function FindFontOptionById(id: string): FontOption {
  return FONTOPTIONS.find((item) => item.id === id) || FONTOPTIONS[0]
}

/**
 * 确保指定字体已加载，避免采样时回退到系统字体
 * @param family Canvas font-family 片段
 * @param fontSize 采样字号
 */
export async function EnsureFontLoaded(
  family: string,
  fontSize: number,
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) {
    return
  }

  const specs = [
    `normal ${fontSize}px ${family}`,
    `italic ${fontSize}px ${family}`,
    `bold ${fontSize}px ${family}`,
    `italic bold ${fontSize}px ${family}`,
  ]

  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)))
    await document.fonts.ready
  } catch {
    // 字体加载失败时继续使用回退字体采样
  }
}
