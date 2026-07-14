// 文本处理：Diff 对比、正则测试、大小写/命名风格转换、去重排序、统计

// ---------- 文本统计 ----------
export interface TextStats {
  chars: number
  charsNoSpaces: number
  words: number
  lines: number
  bytes: number
}

export function textStats(input: string): TextStats {
  const chars = [...input].length
  const charsNoSpaces = [...input.replace(/\s/g, '')].length
  const words = input.trim() ? input.trim().split(/\s+/).length : 0
  const lines = input === '' ? 0 : input.split(/\r\n|\r|\n/).length
  const bytes = new TextEncoder().encode(input).length
  return { chars, charsNoSpaces, words, lines, bytes }
}

// ---------- 大小写转换 ----------
export function toUpperCase(s: string): string {
  return s.toUpperCase()
}
export function toLowerCase(s: string): string {
  return s.toLowerCase()
}
export function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}
export function toSentenceCase(s: string): string {
  return s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase())
}

// ---------- 命名风格转换 ----------
export type NamingStyle =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'space'

/** 将任意命名拆分为单词序列（小写） */
export function splitWords(input: string): string[] {
  return (
    input
      // 在小写/数字与大写之间插入分隔
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // 连续大写与后续大写+小写之间插入分隔 (HTTPServer -> HTTP Server)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // 非字母数字替换为空格
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
  )
}

export function convertNaming(input: string, style: NamingStyle): string {
  const words = splitWords(input)
  if (words.length === 0) return ''
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
  switch (style) {
    case 'camel':
      return words.map((w, i) => (i === 0 ? w : cap(w))).join('')
    case 'pascal':
      return words.map(cap).join('')
    case 'snake':
      return words.join('_')
    case 'kebab':
      return words.join('-')
    case 'constant':
      return words.map((w) => w.toUpperCase()).join('_')
    case 'dot':
      return words.join('.')
    case 'space':
      return words.join(' ')
    default:
      return input
  }
}

export function convertNamingAll(input: string): Record<NamingStyle, string> {
  return {
    camel: convertNaming(input, 'camel'),
    pascal: convertNaming(input, 'pascal'),
    snake: convertNaming(input, 'snake'),
    kebab: convertNaming(input, 'kebab'),
    constant: convertNaming(input, 'constant'),
    dot: convertNaming(input, 'dot'),
    space: convertNaming(input, 'space'),
  }
}

// ---------- 行处理 ----------
export interface LineOps {
  trim?: boolean // 去首尾空格
  dedupe?: boolean // 去重
  removeEmpty?: boolean // 去空行
  sort?: 'none' | 'asc' | 'desc'
  reverse?: boolean
}

export function processLines(input: string, ops: LineOps): string {
  let lines = input.split(/\r\n|\r|\n/)
  if (ops.trim) lines = lines.map((l) => l.trim())
  if (ops.removeEmpty) lines = lines.filter((l) => l.trim() !== '')
  if (ops.dedupe) {
    const seen = new Set<string>()
    lines = lines.filter((l) => {
      if (seen.has(l)) return false
      seen.add(l)
      return true
    })
  }
  if (ops.sort === 'asc') lines.sort((a, b) => a.localeCompare(b))
  else if (ops.sort === 'desc') lines.sort((a, b) => b.localeCompare(a))
  if (ops.reverse) lines.reverse()
  return lines.join('\n')
}

// ---------- 正则测试 ----------
export interface RegexMatch {
  match: string
  index: number
  groups: string[]
  namedGroups: Record<string, string>
}

export interface RegexResult {
  valid: boolean
  error?: string
  matches: RegexMatch[]
}

export function testRegex(
  pattern: string,
  flags: string,
  input: string,
): RegexResult {
  if (pattern === '') return { valid: true, matches: [] }
  let re: RegExp
  try {
    // 确保 g 存在以便遍历所有匹配
    const f = flags.includes('g') ? flags : flags + 'g'
    re = new RegExp(pattern, f)
  } catch (e) {
    return { valid: false, error: (e as Error).message, matches: [] }
  }
  const matches: RegexMatch[] = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(input)) !== null) {
    matches.push({
      match: m[0],
      index: m.index,
      groups: m.slice(1).map((g) => g ?? ''),
      namedGroups: { ...(m.groups ?? {}) },
    })
    if (m.index === re.lastIndex) re.lastIndex++ // 防止零宽匹配死循环
    if (++guard > 100000) break
  }
  return { valid: true, matches }
}

export interface RegexPreset {
  name: string
  pattern: string
  description: string
}

export const regexPresets: RegexPreset[] = [
  { name: '邮箱', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.-]+', description: '匹配电子邮箱地址' },
  { name: '手机号(中国)', pattern: '1[3-9]\\d{9}', description: '中国大陆 11 位手机号' },
  { name: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', description: 'IPv4 地址' },
  { name: 'URL', pattern: 'https?://[\\w./?%&=#:-]+', description: 'HTTP/HTTPS 链接' },
  { name: '身份证(18位)', pattern: '\\d{17}[\\dXx]', description: '中国大陆 18 位身份证号' },
  { name: '日期(YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', description: 'ISO 日期' },
  { name: '十六进制颜色', pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', description: 'HEX 颜色值' },
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]+', description: '连续中文字符' },
]

// ---------- 文本 Diff（行级 LCS） ----------
export type DiffOp = 'equal' | 'insert' | 'delete'

export interface DiffLine {
  op: DiffOp
  text: string
  leftNo?: number
  rightNo?: number
}

export const MAX_DIFF_MATRIX_CELLS = 2_000_000

function assertDiffMatrixSize(rows: number, columns: number, mode: string): void {
  if (rows > Math.floor(MAX_DIFF_MATRIX_CELLS / columns)) {
    throw new Error(`文本过大，${mode} Diff 计算量超过限制，请减少两侧内容后重试`)
  }
}

/** 基于 LCS 的行级 diff */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split(/\r\n|\r|\n/)
  const bLines = b.split(/\r\n|\r|\n/)
  const n = aLines.length
  const m = bLines.length
  assertDiffMatrixSize(n + 1, m + 1, '行级')
  // LCS DP 表
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  )
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        aLines[i] === bLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const result: DiffLine[] = []
  let i = 0
  let j = 0
  let leftNo = 1
  let rightNo = 1
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      result.push({ op: 'equal', text: aLines[i], leftNo: leftNo++, rightNo: rightNo++ })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ op: 'delete', text: aLines[i], leftNo: leftNo++ })
      i++
    } else {
      result.push({ op: 'insert', text: bLines[j], rightNo: rightNo++ })
      j++
    }
  }
  while (i < n) result.push({ op: 'delete', text: aLines[i++], leftNo: leftNo++ })
  while (j < m) result.push({ op: 'insert', text: bLines[j++], rightNo: rightNo++ })
  return result
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

export function diffStats(diff: DiffLine[]): DiffStats {
  return diff.reduce(
    (acc, d) => {
      if (d.op === 'insert') acc.added++
      else if (d.op === 'delete') acc.removed++
      else acc.unchanged++
      return acc
    },
    { added: 0, removed: 0, unchanged: 0 },
  )
}

// ---------- 字符级 Diff（基于 LCS，按 Unicode 码点） ----------
export interface DiffSegment {
  op: DiffOp
  text: string
}

/** 字符级 diff：返回连续片段序列，相邻同类合并 */
export function diffChars(a: string, b: string): DiffSegment[] {
  const aChars = [...a]
  const bChars = [...b]
  const n = aChars.length
  const m = bChars.length
  assertDiffMatrixSize(n + 1, m + 1, '字符级')
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        aChars[i] === bChars[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const raw: DiffSegment[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (aChars[i] === bChars[j]) {
      raw.push({ op: 'equal', text: aChars[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ op: 'delete', text: aChars[i] })
      i++
    } else {
      raw.push({ op: 'insert', text: bChars[j] })
      j++
    }
  }
  while (i < n) raw.push({ op: 'delete', text: aChars[i++] })
  while (j < m) raw.push({ op: 'insert', text: bChars[j++] })
  // 合并相邻同类片段
  const merged: DiffSegment[] = []
  for (const seg of raw) {
    const last = merged[merged.length - 1]
    if (last && last.op === seg.op) last.text += seg.text
    else merged.push({ ...seg })
  }
  return merged
}

// ---------- JSON 结构化对比 ----------
export type JsonDiffType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface JsonDiffEntry {
  path: string
  type: JsonDiffType
  left?: unknown
  right?: unknown
}

/** 递归比较两个 JSON 字符串，返回按路径的差异列表 */
export function diffJson(a: string, b: string): JsonDiffEntry[] {
  const left = JSON.parse(a)
  const right = JSON.parse(b)
  const entries: JsonDiffEntry[] = []
  walkJsonDiff('$', left, right, entries)
  return entries
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function walkJsonDiff(path: string, left: unknown, right: unknown, out: JsonDiffEntry[]): void {
  if (left === undefined && right !== undefined) {
    out.push({ path, type: 'added', right })
    return
  }
  if (left !== undefined && right === undefined) {
    out.push({ path, type: 'removed', left })
    return
  }
  if (isObj(left) && isObj(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    for (const key of [...keys].sort()) {
      walkJsonDiff(`${path}.${key}`, left[key], right[key], out)
    }
    return
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const len = Math.max(left.length, right.length)
    for (let i = 0; i < len; i++) {
      walkJsonDiff(`${path}[${i}]`, left[i], right[i], out)
    }
    return
  }
  if (JSON.stringify(left) === JSON.stringify(right)) {
    out.push({ path, type: 'unchanged', left, right })
  } else {
    out.push({ path, type: 'changed', left, right })
  }
}

export interface JsonDiffStats {
  added: number
  removed: number
  changed: number
  unchanged: number
}

export function jsonDiffStats(entries: JsonDiffEntry[]): JsonDiffStats {
  return entries.reduce(
    (acc, e) => {
      acc[e.type]++
      return acc
    },
    { added: 0, removed: 0, changed: 0, unchanged: 0 },
  )
}
