/**
 * 文本差异对比模块
 * 行级 LCS 对比 + 变更行内字符级高亮，适合文案校对与代码 diff
 */

/** 行级变更类型 */
export type DiffLineKind = 'equal' | 'add' | 'remove' | 'replace'

/** 字符级片段 */
export type DiffCharPart = {
  kind: 'equal' | 'add' | 'remove'
  text: string
}

/** 单行对比结果 */
export type DiffLineRow = {
  kind: DiffLineKind
  leftLineNo: number | null
  rightLineNo: number | null
  leftText: string
  rightText: string
  leftParts: DiffCharPart[]
  rightParts: DiffCharPart[]
}

/** 对比统计 */
export type DiffStats = {
  equal: number
  added: number
  removed: number
  replaced: number
  leftLines: number
  rightLines: number
}

/** 对比结果 */
export type DiffResult = {
  rows: DiffLineRow[]
  stats: DiffStats
}

/** 支持的文本文件扩展名 */
export const TEXT_DIFF_EXTENSIONS = [
  'txt',
  'md',
  'json',
  'jsonc',
  'js',
  'jsx',
  'ts',
  'tsx',
  'vue',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'xml',
  'yml',
  'yaml',
  'csv',
  'svg',
  'ini',
  'env',
  'log',
  'py',
  'go',
  'rs',
  'java',
  'c',
  'cpp',
  'h',
  'sql',
  'sh',
  'bat',
  'ps1',
  'toml',
  'conf',
] as const

/**
 * 按行拆分文本（保留空行，去掉末尾多余空行差异用 \\n 统一）
 * @param text 原文
 * @returns 行数组
 */
export function SplitTextLines(text: string): string[] {
  if (!text) {
    return []
  }
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n')
}

/**
 * 判断文件是否为可对比的文本类型
 * @param file 文件
 * @returns 是否支持
 */
export function IsSupportedTextDiffFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() || '' : ''
  if ((TEXT_DIFF_EXTENSIONS as readonly string[]).includes(ext)) {
    return true
  }
  if (file.type.startsWith('text/')) {
    return true
  }
  if (
    file.type === 'application/json' ||
    file.type === 'application/javascript' ||
    file.type === 'application/xml' ||
    file.type === 'application/x-sh'
  ) {
    return true
  }
  return false
}

/**
 * 读取文本文件内容
 * @param file 文件
 * @returns 文本
 */
export function ReadTextFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!IsSupportedTextDiffFile(file)) {
      reject(new Error(`暂不支持该文件类型：${file.name}`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve(String(reader.result || ''))
    }
    reader.onerror = () => {
      reject(new Error(`读取失败：${file.name}`))
    }
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * 构建 LCS 长度表
 * @param left 左序列
 * @param right 右序列
 * @returns DP 表
 */
function BuildLcsTable(left: string[], right: string[]): number[][] {
  const rows = left.length
  const cols = right.length
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    Array.from({ length: cols + 1 }, () => 0),
  )
  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      if (left[i - 1] === right[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
      }
    }
  }
  return table
}

/**
 * 字符级 LCS 差异片段
 * @param left 左侧文本
 * @param right 右侧文本
 * @returns 左右两侧片段
 */
export function DiffChars(
  left: string,
  right: string,
): { leftParts: DiffCharPart[]; rightParts: DiffCharPart[] } {
  if (left === right) {
    return {
      leftParts: left ? [{ kind: 'equal', text: left }] : [],
      rightParts: right ? [{ kind: 'equal', text: right }] : [],
    }
  }

  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  const table = BuildLcsTable(leftChars, rightChars)
  const leftParts: DiffCharPart[] = []
  const rightParts: DiffCharPart[] = []

  /**
   * 追加同类型片段
   * @param parts 目标
   * @param kind 类型
   * @param ch 字符
   */
  const PushPart = (
    parts: DiffCharPart[],
    kind: DiffCharPart['kind'],
    ch: string,
  ) => {
    const last = parts[parts.length - 1]
    if (last && last.kind === kind) {
      last.text += ch
      return
    }
    parts.push({ kind, text: ch })
  }

  let i = leftChars.length
  let j = rightChars.length
  const leftStack: DiffCharPart[] = []
  const rightStack: DiffCharPart[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftChars[i - 1] === rightChars[j - 1]) {
      leftStack.push({ kind: 'equal', text: leftChars[i - 1] })
      rightStack.push({ kind: 'equal', text: rightChars[j - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      rightStack.push({ kind: 'add', text: rightChars[j - 1] })
      j -= 1
    } else if (i > 0) {
      leftStack.push({ kind: 'remove', text: leftChars[i - 1] })
      i -= 1
    }
  }

  for (let k = leftStack.length - 1; k >= 0; k -= 1) {
    PushPart(leftParts, leftStack[k].kind, leftStack[k].text)
  }
  for (let k = rightStack.length - 1; k >= 0; k -= 1) {
    PushPart(rightParts, rightStack[k].kind, rightStack[k].text)
  }

  return { leftParts, rightParts }
}

/**
 * 行级文本对比
 * @param leftText 原文（左）
 * @param rightText 对照（右）
 * @returns 对比结果
 */
export function DiffTexts(leftText: string, rightText: string): DiffResult {
  const leftLines = SplitTextLines(leftText)
  const rightLines = SplitTextLines(rightText)
  const table = BuildLcsTable(leftLines, rightLines)

  type RawOp =
    | { type: 'equal'; left: string; right: string }
    | { type: 'remove'; left: string }
    | { type: 'add'; right: string }

  const ops: RawOp[] = []
  let i = leftLines.length
  let j = rightLines.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      ops.push({ type: 'equal', left: leftLines[i - 1], right: rightLines[j - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      ops.push({ type: 'add', right: rightLines[j - 1] })
      j -= 1
    } else if (i > 0) {
      ops.push({ type: 'remove', left: leftLines[i - 1] })
      i -= 1
    }
  }

  ops.reverse()

  const rows: DiffLineRow[] = []
  let leftLineNo = 0
  let rightLineNo = 0
  const stats: DiffStats = {
    equal: 0,
    added: 0,
    removed: 0,
    replaced: 0,
    leftLines: leftLines.length,
    rightLines: rightLines.length,
  }

  let index = 0
  while (index < ops.length) {
    const current = ops[index]
    const next = ops[index + 1]

    if (current.type === 'equal') {
      leftLineNo += 1
      rightLineNo += 1
      rows.push({
        kind: 'equal',
        leftLineNo,
        rightLineNo,
        leftText: current.left,
        rightText: current.right,
        leftParts: [{ kind: 'equal', text: current.left }],
        rightParts: [{ kind: 'equal', text: current.right }],
      })
      stats.equal += 1
      index += 1
      continue
    }

    // 相邻删除+新增合并为替换，便于行内字符高亮
    if (current.type === 'remove' && next?.type === 'add') {
      leftLineNo += 1
      rightLineNo += 1
      const parts = DiffChars(current.left, next.right)
      rows.push({
        kind: 'replace',
        leftLineNo,
        rightLineNo,
        leftText: current.left,
        rightText: next.right,
        leftParts: parts.leftParts,
        rightParts: parts.rightParts,
      })
      stats.replaced += 1
      index += 2
      continue
    }

    if (current.type === 'remove') {
      leftLineNo += 1
      rows.push({
        kind: 'remove',
        leftLineNo,
        rightLineNo: null,
        leftText: current.left,
        rightText: '',
        leftParts: [{ kind: 'remove', text: current.left }],
        rightParts: [],
      })
      stats.removed += 1
      index += 1
      continue
    }

    rightLineNo += 1
    rows.push({
      kind: 'add',
      leftLineNo: null,
      rightLineNo,
      leftText: '',
      rightText: current.right,
      leftParts: [],
      rightParts: [{ kind: 'add', text: current.right }],
    })
    stats.added += 1
    index += 1
  }

  return { rows, stats }
}

/**
 * 交换两侧文本
 * @param left 左
 * @param right 右
 * @returns 交换后的左右
 */
export function SwapTexts(
  left: string,
  right: string,
): { left: string; right: string } {
  return { left: right, right: left }
}
