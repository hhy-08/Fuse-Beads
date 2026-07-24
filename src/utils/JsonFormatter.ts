/**
 * JSON 格式化 / 校验工具模块
 * 支持普通 JSON 与后端 JSON.stringify 后的二次转义字符串解析、美化与压缩
 */

/** 缩进空格选项 */
export type JsonIndentSize = 2 | 4

/** 解析成功结果 */
export type JsonParseSuccess = {
  ok: true
  data: unknown
  /** 是否经过二次（或多次）字符串解包 */
  wasStringified: boolean
  /** 解包次数（0 = 直接是对象/数组等） */
  unwrapCount: number
}

/** 解析失败结果 */
export type JsonParseFailure = {
  ok: false
  message: string
  /** 错误大致行号（1-based，无法定位时为 null） */
  line: number | null
  /** 错误大致列号（1-based，无法定位时为 null） */
  column: number | null
}

/** 解析结果 */
export type JsonParseResult = JsonParseSuccess | JsonParseFailure

/** 校验结果 */
export type JsonValidateResult = {
  valid: boolean
  message: string
  line: number | null
  column: number | null
  typeLabel: string
  sizeBytes: number
  unwrapCount: number
}

/** 支持上传的 JSON 相关扩展名 */
export const JSON_FORMATTER_EXTENSIONS = ['json', 'jsonc', 'txt', 'log'] as const

/**
 * 去掉首尾 BOM 与空白
 * @param text 原始文本
 * @returns 清理后文本
 */
export function NormalizeJsonInput(text: string): string {
  if (!text) {
    return ''
  }
  return text.replace(/^\uFEFF/, '').trim()
}

/**
 * 判断文件是否为可加载的 JSON 文本类型
 * @param file 文件
 * @returns 是否支持
 */
export function IsSupportedJsonFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() || '' : ''
  if ((JSON_FORMATTER_EXTENSIONS as readonly string[]).includes(ext)) {
    return true
  }
  return (
    file.type.includes('json') ||
    file.type === 'text/plain' ||
    file.type === 'application/octet-stream'
  )
}

/**
 * 从 JSON.parse 错误信息中提取行列位置
 * @param message 错误文案
 * @param source 原始字符串（用于按 position 推算行列）
 * @returns 行列；无法解析时为 null
 */
export function ResolveJsonErrorPosition(
  message: string,
  source: string
): { line: number | null; column: number | null } {
  const positionMatch = message.match(/position\s+(\d+)/i)
  if (positionMatch) {
    const position = Number(positionMatch[1])
    if (Number.isFinite(position) && position >= 0) {
      const before = source.slice(0, position)
      const lines = before.split(/\r\n|\n|\r/)
      const line = lines.length
      const column = (lines[lines.length - 1] || '').length + 1
      return { line, column }
    }
  }

  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (lineColMatch) {
    return {
      line: Number(lineColMatch[1]) || null,
      column: Number(lineColMatch[2]) || null,
    }
  }

  return { line: null, column: null }
}

/**
 * 将 JSON 解析错误转为可读中文提示
 * @param error 捕获到的错误
 * @param source 原始输入
 * @returns 失败结果字段
 */
export function FormatJsonParseError(
  error: unknown,
  source: string
): Pick<JsonParseFailure, 'message' | 'line' | 'column'> {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '未知解析错误'
  const { line, column } = ResolveJsonErrorPosition(raw, source)
  let message = raw
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/^Unexpected token/i, '意外的标记')
    .replace(/^Unexpected end of JSON input/i, 'JSON 不完整，意外结束')
    .replace(/^Expected/i, '期望')

  if (line != null && column != null) {
    message = `第 ${line} 行第 ${column} 列：${message}`
  } else if (line != null) {
    message = `第 ${line} 行：${message}`
  }

  return { message, line, column }
}

/**
 * 尝试将可能被多次 JSON.stringify 的字符串层层解包为真实值
 * 例如 "\"{\\\"a\\\":1}\"" → { a: 1 }
 * @param value 已成功 JSON.parse 的值
 * @param maxDepth 最大解包层数，防止异常超长循环
 * @returns 解包后的值与次数
 */
export function UnwrapStringifiedJson(
  value: unknown,
  maxDepth = 8
): { data: unknown; unwrapCount: number } {
  let current = value
  let unwrapCount = 0

  while (typeof current === 'string' && unwrapCount < maxDepth) {
    const trimmed = current.trim()
    if (!trimmed) {
      break
    }

    const first = trimmed[0]
    const looksLikeJson =
      first === '{' ||
      first === '[' ||
      first === '"' ||
      first === 't' ||
      first === 'f' ||
      first === 'n' ||
      (first >= '0' && first <= '9') ||
      first === '-'

    if (!looksLikeJson) {
      break
    }

    try {
      const next = JSON.parse(trimmed) as unknown
      unwrapCount += 1
      current = next
      if (typeof next !== 'string') {
        break
      }
    } catch {
      break
    }
  }

  return { data: current, unwrapCount }
}

/**
 * 解析输入：支持普通 JSON，以及后端 JSON.stringify 后的字符串
 * @param text 用户输入
 * @returns 解析结果
 */
export function ParseJsonInput(text: string): JsonParseResult {
  const source = NormalizeJsonInput(text)
  if (!source) {
    return {
      ok: false,
      message: '请先输入 JSON 内容',
      line: null,
      column: null,
    }
  }

  try {
    const parsed = JSON.parse(source) as unknown
    const { data, unwrapCount } = UnwrapStringifiedJson(parsed)
    return {
      ok: true,
      data,
      wasStringified: unwrapCount > 0,
      unwrapCount,
    }
  } catch (error) {
    const detail = FormatJsonParseError(error, source)
    return {
      ok: false,
      message: detail.message,
      line: detail.line,
      column: detail.column,
    }
  }
}

/**
 * 描述值的 JSON 类型文案
 * @param data 解析后的值
 * @returns 类型标签
 */
export function ResolveJsonTypeLabel(data: unknown): string {
  if (data === null) {
    return 'null'
  }
  if (Array.isArray(data)) {
    return `数组（${data.length} 项）`
  }
  if (typeof data === 'object') {
    return `对象（${Object.keys(data as object).length} 个键）`
  }
  if (typeof data === 'string') {
    return '字符串'
  }
  if (typeof data === 'number') {
    return '数字'
  }
  if (typeof data === 'boolean') {
    return '布尔'
  }
  return typeof data
}

/**
 * 计算 UTF-8 近似字节数（按 TextEncoder）
 * @param text 文本
 * @returns 字节数
 */
export function MeasureTextBytes(text: string): number {
  if (!text) {
    return 0
  }
  return new TextEncoder().encode(text).length
}

/**
 * 校验 JSON 输入
 * @param text 用户输入
 * @returns 校验结果
 */
export function ValidateJsonInput(text: string): JsonValidateResult {
  const parsed = ParseJsonInput(text)
  if (!parsed.ok) {
    return {
      valid: false,
      message: parsed.message,
      line: parsed.line,
      column: parsed.column,
      typeLabel: '',
      sizeBytes: MeasureTextBytes(NormalizeJsonInput(text)),
      unwrapCount: 0,
    }
  }

  const typeLabel = ResolveJsonTypeLabel(parsed.data)
  const tip =
    parsed.unwrapCount > 0
      ? `有效 JSON（已解包 ${parsed.unwrapCount} 层 stringify 字符串）· ${typeLabel}`
      : `有效 JSON · ${typeLabel}`

  return {
    valid: true,
    message: tip,
    line: null,
    column: null,
    typeLabel,
    sizeBytes: MeasureTextBytes(NormalizeJsonInput(text)),
    unwrapCount: parsed.unwrapCount,
  }
}

/**
 * 美化（格式化）JSON
 * @param text 用户输入
 * @param indent 缩进空格数
 * @returns 成功返回美化文本，失败返回错误信息
 */
export function BeautifyJson(
  text: string,
  indent: JsonIndentSize = 2
): { ok: true; text: string; unwrapCount: number } | JsonParseFailure {
  const parsed = ParseJsonInput(text)
  if (!parsed.ok) {
    return parsed
  }

  return {
    ok: true,
    text: JSON.stringify(parsed.data, null, indent),
    unwrapCount: parsed.unwrapCount,
  }
}

/**
 * 压缩（minify）JSON
 * @param text 用户输入
 * @returns 成功返回压缩文本，失败返回错误信息
 */
export function MinifyJson(
  text: string
): { ok: true; text: string; unwrapCount: number } | JsonParseFailure {
  const parsed = ParseJsonInput(text)
  if (!parsed.ok) {
    return parsed
  }

  return {
    ok: true,
    text: JSON.stringify(parsed.data),
    unwrapCount: parsed.unwrapCount,
  }
}

/**
 * 将对象再次 JSON.stringify 成「字符串字面量」形式（便于模拟后端返回）
 * @param text 用户输入
 * @returns 成功返回 stringify 后的文本，失败返回错误
 */
export function StringifyJsonAsLiteral(
  text: string
): { ok: true; text: string } | JsonParseFailure {
  const parsed = ParseJsonInput(text)
  if (!parsed.ok) {
    return parsed
  }

  return {
    ok: true,
    text: JSON.stringify(JSON.stringify(parsed.data)),
  }
}

/**
 * 统计文本行数与字符数
 * @param text 文本
 * @returns 行数与字符数
 */
export function CountJsonTextStats(text: string): {
  lines: number
  chars: number
} {
  if (!text) {
    return { lines: 0, chars: 0 }
  }
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.length === 0 ? 0 : normalized.split('\n').length
  return { lines, chars: text.length }
}

/** JSON 树节点类型 */
export type JsonTreeKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

/** 树形子节点描述（用于递归渲染） */
export type JsonTreeChild = {
  key: string | null
  path: string
  value: unknown
  isLast: boolean
}

/**
 * 判断值是否为可折叠的对象或数组
 * @param value 任意值
 * @returns 是否可折叠
 */
export function IsJsonExpandable(value: unknown): boolean {
  return value !== null && typeof value === 'object'
}

/**
 * 解析值的树节点类型
 * @param value 任意值
 * @returns 节点类型
 */
export function ResolveJsonTreeKind(value: unknown): JsonTreeKind {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'object') {
    return 'object'
  }
  if (typeof value === 'string') {
    return 'string'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  return 'null'
}

/**
 * 统计对象键数或数组长度
 * @param value 对象或数组
 * @returns 子项数量
 */
export function CountJsonChildren(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length
  }
  return 0
}

/**
 * 生成子节点路径
 * @param parentPath 父路径
 * @param key 键名或下标
 * @returns 子路径
 */
export function BuildJsonChildPath(parentPath: string, key: string | number): string {
  if (!parentPath || parentPath === 'root') {
    return `root.${key}`
  }
  return `${parentPath}.${key}`
}

/**
 * 列出对象 / 数组的子节点
 * @param value 对象或数组
 * @param parentPath 父路径
 * @returns 子节点列表
 */
export function ListJsonTreeChildren(
  value: unknown,
  parentPath: string
): JsonTreeChild[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: String(index),
      path: BuildJsonChildPath(parentPath, index),
      value: item,
      isLast: index === value.length - 1,
    }))
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return entries.map(([key, child], index) => ({
      key,
      path: BuildJsonChildPath(parentPath, key),
      value: child,
      isLast: index === entries.length - 1,
    }))
  }

  return []
}

/**
 * 收集所有可折叠节点路径（用于全部展开 / 收起）
 * @param value 根值
 * @param path 当前路径
 * @returns 路径列表
 */
export function CollectExpandablePaths(value: unknown, path = 'root'): string[] {
  if (!IsJsonExpandable(value)) {
    return []
  }

  const paths = [path]
  const children = ListJsonTreeChildren(value, path)
  for (const child of children) {
    paths.push(...CollectExpandablePaths(child.value, child.path))
  }
  return paths
}

/**
 * 将原始值格式化为可展示的 JSON 字面量文本
 * @param value 原始值（非对象/数组）
 * @returns 展示文本
 */
export function FormatJsonPrimitive(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}
