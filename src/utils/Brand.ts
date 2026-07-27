/**
 * 应用品牌与标题常量
 * 统一各页面展示名称，避免文案分散不一致
 */

/** 品牌名（页头展示） */
export const APPBRAND = 'Toolbox'

/** 中文产品名（文档标题 / 环境默认标题） */
export const APPNAME = '实用工具箱'

/** npm / 技术标识（User-Agent、脚本等） */
export const APPSLUG = 'utility-toolbox'

/** 产品一句话简介 */
export const APPDESCRIPTION =
  '图片、文本、办公与趣味类本地小工具集合：压缩、水印、抠图、JSON / PDF、单位换算等，浏览器内完成、不上传服务器'

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
