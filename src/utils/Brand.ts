/**
 * 应用品牌与标题常量
 * 统一各页面展示名称，避免文案分散不一致
 */

/** 英文品牌名（页头展示） */
export const APPBRAND = 'Fuse Kit'

/** 中文产品名（文档标题 / 环境默认标题） */
export const APPNAME = 'Fuse 工具箱'

/** 产品一句话简介 */
export const APPDESCRIPTION =
  '拼豆图纸、AI 抠图、图片处理、Markdown 卡片、JSON / PDF、文本对比与单位换算等本地实用小工具'

/**
 * 获取带环境后缀的应用标题
 * @param suffix 环境后缀，如「开发」「测试」；空则不加
 * @returns 标题文案
 */
export function BuildAppTitle(suffix = ''): string {
  if (!suffix) {
    return APPNAME
  }
  return `${APPNAME}-${suffix}`
}
