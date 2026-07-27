/**
 * 环境变量读取工具
 * 统一从 Vite 注入的 process.env / import.meta.env 取值
 */

/**
 * 获取当前运行环境标识
 * @returns 环境名：dev / test / prod
 */
export function GetAppEnv(): string {
  return process.env.VITE_ENV || import.meta.env.VITE_ENV || 'dev'
}

/**
 * 获取 API 基础地址
 * @returns API Base URL
 */
export function GetApiBaseUrl(): string {
  return process.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
}

/**
 * 获取应用标题
 * @returns 标题文案
 */
export function GetAppTitle(): string {
  return process.env.VITE_APP_TITLE || import.meta.env.VITE_APP_TITLE || '实用工具箱'
}

/**
 * 获取路由根路径
 * @returns base route
 */
export function GetBaseRoute(): string {
  return process.env.VITE_BASE_ROUTE || import.meta.env.VITE_BASE_ROUTE || '/'
}
