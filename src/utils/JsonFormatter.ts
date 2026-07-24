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

/** AI / 智能修复结果 */
export type JsonRepairSuccess = {
  ok: true
  /** 修复后可直接解析的文本（美化前的规范化原文） */
  repairedText: string
  /** 解析后的数据 */
  data: unknown
  /** 应用过的修复步骤说明 */
  fixes: string[]
  unwrapCount: number
}

/** 修复失败 */
export type JsonRepairFailure = {
  ok: false
  message: string
}

export type JsonRepairResult = JsonRepairSuccess | JsonRepairFailure

/**
 * 去掉行注释与块注释（不在字符串内的简单场景）
 * @param text 文本
 * @returns 去注释后文本
 */
export function StripJsonComments(text: string): string {
  let result = ''
  let index = 0
  let inString = false
  let stringQuote = ''
  let escaped = false

  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === stringQuote) {
        inString = false
        stringQuote = ''
      }
      index += 1
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringQuote = char
      result += char
      index += 1
      continue
    }

    if (char === '/' && next === '/') {
      index += 2
      while (index < text.length && text[index] !== '\n') {
        index += 1
      }
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        index += 1
      }
      index += 2
      continue
    }

    result += char
    index += 1
  }

  return result
}

/**
 * 去掉对象 / 数组尾逗号
 * @param text 文本
 * @returns 处理后文本
 */
export function StripJsonTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}

/**
 * 将松散转义片段 {\"a\":1} 还原为合法 JSON
 * @param text 文本
 * @returns 处理后文本
 */
export function UnescapeLooseJsonEscapes(text: string): string {
  let current = text
  // 连续多轮，处理 \\\" 等层层转义
  for (let round = 0; round < 6; round += 1) {
    if (!/\\["'\\nrtbf/]/.test(current) && !current.includes('\\\\')) {
      break
    }
    const next = current
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\//g, '/')
      .replace(/\\\\/g, '\\')
    if (next === current) {
      break
    }
    current = next
  }
  return current
}

/**
 * 单引号字符串改为双引号（简易场景）
 * @param text 文本
 * @returns 处理后文本
 */
export function ConvertJsonSingleQuotes(text: string): string {
  return text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner: string) => {
    const escaped = inner.replace(/"/g, '\\"')
    return `"${escaped}"`
  })
}

/**
 * 给未加引号的键名补双引号
 * @param text 文本
 * @returns 处理后文本
 */
export function QuoteJsonUnquotedKeys(text: string): string {
  return text.replace(
    /([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g,
    '$1"$2"$3'
  )
}

/**
 * 将 JS / Python 字面量转为 JSON
 * @param text 文本
 * @returns 处理后文本
 */
export function NormalizeJsonLiterals(text: string): string {
  return text
    .replace(/\bundefined\b/g, 'null')
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNaN\b/g, 'null')
    .replace(/\bInfinity\b/g, 'null')
    .replace(/-Infinity\b/g, 'null')
}

/**
 * 从杂讯文本中截取最外层 {…} 或 […]
 * @param text 文本
 * @returns 截取结果；失败返回原文本
 */
export function ExtractJsonFragment(text: string): string {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  let start = -1
  let open = ''
  let close = ''

  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    start = objectStart
    open = '{'
    close = '}'
  } else if (arrayStart >= 0) {
    start = arrayStart
    open = '['
    close = ']'
  } else {
    return text
  }

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === open) {
      depth += 1
    } else if (char === close) {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return text.slice(start)
}

/**
 * 尝试把「裸转义内容」包成 JSON 字符串再解析
 * @param text 文本
 * @returns 候选文本列表
 */
export function BuildQuotedJsonCandidates(text: string): string[] {
  const candidates: string[] = []
  if (!text.startsWith('"')) {
    candidates.push(`"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    // 原文本身已含 \" 时，直接外层加引号
    candidates.push(`"${text}"`)
  }
  return candidates
}

/**
 * 补全被截断的 JSON：关闭未结束的字符串与括号
 * @param text 可能不完整的 JSON 文本
 * @returns 补全后的文本
 */
export function CloseTruncatedJson(text: string): string {
  let inString = false
  let escaped = false
  const stack: string[] = []

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      stack.push('}')
    } else if (char === '[') {
      stack.push(']')
    } else if (char === '}' || char === ']') {
      if (stack.length && stack[stack.length - 1] === char) {
        stack.pop()
      }
    }
  }

  let result = text
  if (escaped) {
    result += ' '
  }
  if (inString) {
    result += '"'
  }

  // 去掉收尾处可能多余的逗号 / 冒号后再补括号
  result = result.replace(/[,:]\s*$/, '')
  while (stack.length) {
    result += stack.pop()
  }
  return result
}

/**
 * 本地智能纠错：常见非法 JSON → 可解析 JSON（不依赖云端 AI）
 * @param text 原始输入
 * @returns 修复结果
 */
export function RepairJsonInput(text: string): JsonRepairResult {
  const source = NormalizeJsonInput(text)
  if (!source) {
    return { ok: false, message: '请先输入需要修复的内容' }
  }

  const direct = ParseJsonInput(source)
  if (direct.ok) {
    return {
      ok: true,
      repairedText: JSON.stringify(direct.data),
      data: direct.data,
      fixes: ['原文已可解析，无需修复'],
      unwrapCount: direct.unwrapCount,
    }
  }

  type Step = { name: string; Apply: (input: string) => string }
  const steps: Step[] = [
    { name: '去除注释', Apply: StripJsonComments },
    { name: '去除尾逗号', Apply: StripJsonTrailingCommas },
    { name: '还原松散转义', Apply: UnescapeLooseJsonEscapes },
    { name: '单引号转双引号', Apply: ConvertJsonSingleQuotes },
    { name: '键名补引号', Apply: QuoteJsonUnquotedKeys },
    { name: '规范化字面量', Apply: NormalizeJsonLiterals },
    { name: '截取 JSON 片段', Apply: ExtractJsonFragment },
    { name: '补全截断括号', Apply: CloseTruncatedJson },
  ]

  const tryParse = (
    candidate: string,
    fixes: string[]
  ): JsonRepairSuccess | null => {
    const parsed = ParseJsonInput(candidate)
    if (!parsed.ok) {
      return null
    }
    return {
      ok: true,
      repairedText: JSON.stringify(parsed.data),
      data: parsed.data,
      fixes: fixes.length ? fixes : ['自动规范化'],
      unwrapCount: parsed.unwrapCount,
    }
  }

  // 单步尝试
  for (const step of steps) {
    const next = step.Apply(source)
    if (next === source) {
      continue
    }
    const hit = tryParse(next, [step.name])
    if (hit) {
      return hit
    }
  }

  // 按顺序叠加
  let pipeline = source
  const applied: string[] = []
  for (const step of steps) {
    const next = step.Apply(pipeline)
    if (next !== pipeline) {
      pipeline = next
      applied.push(step.name)
      const hit = tryParse(pipeline, [...applied])
      if (hit) {
        return hit
      }
    }
  }

  // 叠加后再强制补全截断
  const closed = CloseTruncatedJson(pipeline)
  if (closed !== pipeline) {
    const hit = tryParse(closed, [...applied, '补全截断括号'])
    if (hit) {
      return hit
    }
  }

  // 包成字符串再解析（应对裸 \"...\" 内容）
  for (const quoted of BuildQuotedJsonCandidates(source)) {
    const hit = tryParse(quoted, ['补全为 JSON 字符串并解包'])
    if (hit) {
      return hit
    }
  }
  for (const quoted of BuildQuotedJsonCandidates(pipeline)) {
    const hit = tryParse(quoted, [...applied, '补全为 JSON 字符串并解包'])
    if (hit) {
      return hit
    }
  }

  // 先松散还原再包字符串
  const loose = UnescapeLooseJsonEscapes(source)
  if (loose !== source) {
    const hit = tryParse(loose, ['还原松散转义'])
    if (hit) {
      return hit
    }
    const looseClosed = CloseTruncatedJson(loose)
    const closedHit = tryParse(looseClosed, ['还原松散转义', '补全截断括号'])
    if (closedHit) {
      return closedHit
    }
  }

  return {
    ok: false,
    message: '智能修复失败，请检查是否为残缺或严重损坏的 JSON',
  }
}
