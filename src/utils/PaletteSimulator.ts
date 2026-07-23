/**
 * 拼豆配色模拟器工具模块
 * 色号解析、方案本地保存与读取
 */

import {
  FindMardColorByCode,
  type MardColor,
} from '@/utils/MardColors'

/** 配色方案 */
export type PaletteScheme = {
  id: string
  name: string
  codes: string[]
  updatedAt: number
}

const STORAGEKEY = 'fuse-kit-palette-schemes'
const MAXSCHEMES = 40

/**
 * 解析输入文本中的色号（逗号 / 空格 / 换行分隔）
 * @param text 原始输入
 * @returns 规范化色号列表（去重保序）
 */
export function ParseColorCodeInput(text: string): string[] {
  const parts = text
    .split(/[\s,，;；、|]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)

  const seen = new Set<string>()
  const codes: string[] = []
  for (const code of parts) {
    if (seen.has(code)) {
      continue
    }
    seen.add(code)
    codes.push(code)
  }
  return codes
}

/**
 * 将色号列表解析为有效 MARD 颜色，并标出无效色号
 * @param codes 色号列表
 * @returns 有效色与无效色号
 */
export function ResolvePaletteColors(codes: string[]): {
  colors: MardColor[]
  invalidCodes: string[]
} {
  const colors: MardColor[] = []
  const invalidCodes: string[] = []
  const seen = new Set<string>()

  for (const raw of codes) {
    const code = raw.trim().toUpperCase()
    if (!code || seen.has(code)) {
      continue
    }
    seen.add(code)
    const matched = FindMardColorByCode(code)
    if (matched) {
      colors.push(matched)
    } else {
      invalidCodes.push(code)
    }
  }

  return { colors, invalidCodes }
}

/**
 * 生成方案 ID
 * @returns ID
 */
export function CreateSchemeId(): string {
  return `scheme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 从 localStorage 读取已保存方案
 * @returns 方案列表（新到旧）
 */
export function LoadPaletteSchemes(): PaletteScheme[] {
  try {
    const raw = localStorage.getItem(STORAGEKEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as PaletteScheme[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          Array.isArray(item.codes),
      )
      .map((item) => ({
        id: item.id,
        name: item.name.trim() || '未命名方案',
        codes: item.codes
          .map((code) => String(code).trim().toUpperCase())
          .filter(Boolean),
        updatedAt:
          typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/**
 * 写入方案列表到 localStorage
 * @param schemes 方案列表
 */
export function SavePaletteSchemes(schemes: PaletteScheme[]) {
  const trimmed = schemes.slice(0, MAXSCHEMES)
  localStorage.setItem(STORAGEKEY, JSON.stringify(trimmed))
}

/**
 * 新增或覆盖同名方案
 * @param name 方案名
 * @param codes 色号列表
 * @param existingId 覆盖已有 ID（可选）
 * @returns 更新后的列表与当前方案
 */
export function UpsertPaletteScheme(
  name: string,
  codes: string[],
  existingId?: string,
): { schemes: PaletteScheme[]; scheme: PaletteScheme } {
  const schemes = LoadPaletteSchemes()
  const normalizedCodes = ParseColorCodeInput(codes.join(' '))
  if (!normalizedCodes.length) {
    throw new Error('请至少添加一个色号')
  }
  const schemeName = name.trim() || `配色方案 ${schemes.length + 1}`
  const now = Date.now()

  if (existingId) {
    const index = schemes.findIndex((item) => item.id === existingId)
    if (index >= 0) {
      const scheme: PaletteScheme = {
        id: existingId,
        name: schemeName,
        codes: normalizedCodes,
        updatedAt: now,
      }
      schemes.splice(index, 1, scheme)
      SavePaletteSchemes(schemes)
      return { schemes: LoadPaletteSchemes(), scheme }
    }
  }

  const scheme: PaletteScheme = {
    id: CreateSchemeId(),
    name: schemeName,
    codes: normalizedCodes,
    updatedAt: now,
  }
  schemes.unshift(scheme)
  SavePaletteSchemes(schemes)
  return { schemes: LoadPaletteSchemes(), scheme }
}

/**
 * 删除方案
 * @param schemeId 方案 ID
 * @returns 更新后的列表
 */
export function DeletePaletteScheme(schemeId: string): PaletteScheme[] {
  const schemes = LoadPaletteSchemes().filter((item) => item.id !== schemeId)
  SavePaletteSchemes(schemes)
  return schemes
}

/**
 * 格式化时间戳为本地文案
 * @param timestamp 毫秒时间戳
 * @returns 文案
 */
export function FormatSchemeTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
