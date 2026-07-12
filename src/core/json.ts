// JSON 工具核心逻辑：格式化、压缩、校验、排序键、JSONPath 查询

export type IndentStyle = 2 | 4 | 'tab'

function indentValue(style: IndentStyle): string | number {
  return style === 'tab' ? '\t' : style
}

export interface JsonValidateResult {
  valid: boolean
  error?: string
  line?: number
  column?: number
}

/** 校验 JSON，错误时尽力定位到行列 */
export function validateJson(input: string): JsonValidateResult {
  if (input.trim() === '') return { valid: false, error: '输入为空' }
  try {
    JSON.parse(input)
    return { valid: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // V8 错误形如 "... at position 123 (line 4 column 5)"
    const posMatch = msg.match(/position (\d+)/)
    const lineColMatch = msg.match(/line (\d+) column (\d+)/)
    if (lineColMatch) {
      return {
        valid: false,
        error: msg,
        line: Number(lineColMatch[1]),
        column: Number(lineColMatch[2]),
      }
    }
    if (posMatch) {
      const pos = Number(posMatch[1])
      const before = input.slice(0, pos)
      const line = before.split('\n').length
      const column = pos - before.lastIndexOf('\n')
      return { valid: false, error: msg, line, column }
    }
    return { valid: false, error: msg }
  }
}

/** 格式化 / 美化 */
export function formatJson(input: string, indent: IndentStyle = 2): string {
  const parsed = JSON.parse(input)
  return JSON.stringify(parsed, null, indentValue(indent))
}

/** 压缩为单行 */
export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input))
}

/** 转义为字符串字面量（可嵌入代码） */
export function escapeJsonString(input: string): string {
  return JSON.stringify(input)
}

/** 反转义字符串字面量 */
export function unescapeJsonString(input: string): string {
  const trimmed = input.trim()
  // 若已是带双引号的 JSON 字符串字面量，直接解析
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return JSON.parse(trimmed)
  }
  // 单引号包裹：转为双引号字面量再解析
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    const inner = trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')
    return JSON.parse('"' + inner + '"')
  }
  // 裸内容：转义引号后包裹解析
  return JSON.parse('"' + input.replace(/"/g, '\\"') + '"')
}

/** 递归排序对象键 */
export function sortJsonKeys(input: string, recursive = true, indent: IndentStyle = 2): string {
  const parsed = JSON.parse(input)
  const sorted = sortValue(parsed, recursive)
  return JSON.stringify(sorted, null, indentValue(indent))
}

function sortValue(value: unknown, recursive: boolean): unknown {
  if (Array.isArray(value)) {
    return recursive ? value.map((v) => sortValue(v, recursive)) : value
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      out[key] = recursive ? sortValue(obj[key], recursive) : obj[key]
    }
    return out
  }
  return value
}

/**
 * 轻量 JSONPath 查询，支持：
 * $.a.b、$.a[0]、$.a.*、$..key（递归下降）、$[*]、
 * 切片 $.a[0:2]、$.a[1:]、$.a[:3]、$.a[::2]，
 * 过滤表达式 $.a[?(@.x>1)]（支持 == != > >= < <= 与 =~ 正则，@.field 或 @）
 */
export function queryJsonPath(input: string, path: string): unknown[] {
  const data = JSON.parse(input)
  const trimmed = path.trim()
  if (trimmed === '' || trimmed === '$') return [data]
  const tokens = tokenizePath(trimmed)
  let current: unknown[] = [data]
  for (const token of tokens) {
    const next: unknown[] = []
    if (token.recursive) {
      for (const node of current) {
        collectRecursive(node, token.key!, next)
      }
    } else if (token.wildcard) {
      for (const node of current) {
        if (Array.isArray(node)) next.push(...node)
        else if (node && typeof node === 'object') next.push(...Object.values(node))
      }
    } else if (token.slice) {
      for (const node of current) {
        if (Array.isArray(node)) next.push(...applySlice(node, token.slice))
      }
    } else if (token.filter) {
      for (const node of current) {
        const items = Array.isArray(node)
          ? node
          : node && typeof node === 'object'
            ? Object.values(node)
            : []
        for (const item of items) {
          if (evalFilter(item, token.filter)) next.push(item)
        }
      }
    } else if (token.index !== undefined) {
      for (const node of current) {
        if (Array.isArray(node)) {
          const idx = token.index < 0 ? node.length + token.index : token.index
          if (idx >= 0 && idx < node.length) next.push(node[idx])
        }
      }
    } else if (token.key !== undefined) {
      for (const node of current) {
        if (node && typeof node === 'object' && !Array.isArray(node)) {
          const obj = node as Record<string, unknown>
          if (token.key in obj) next.push(obj[token.key])
        }
      }
    }
    current = next
  }
  return current
}

interface SliceSpec {
  start?: number
  end?: number
  step?: number
}

interface FilterSpec {
  field: string // @ 之后的字段路径（如 x 或 a.b），空串表示对元素本身比较
  op: '==' | '!=' | '>' | '>=' | '<' | '<=' | '=~' | 'exists'
  value?: string | number | boolean | null
  regex?: RegExp
}

interface PathToken {
  key?: string
  index?: number
  wildcard?: boolean
  recursive?: boolean
  slice?: SliceSpec
  filter?: FilterSpec
}

function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = []
  let i = 0
  if (path[0] === '$') i = 1
  while (i < path.length) {
    const ch = path[i]
    if (ch === '.') {
      if (path[i + 1] === '.') {
        // 递归下降 ..key
        i += 2
        let key = ''
        while (i < path.length && /[\w$]/.test(path[i])) key += path[i++]
        tokens.push({ recursive: true, key })
      } else {
        i += 1
        let key = ''
        while (i < path.length && /[\w$]/.test(path[i])) key += path[i++]
        if (key === '*') tokens.push({ wildcard: true })
        else if (key) tokens.push({ key })
      }
    } else if (ch === '[') {
      // 找到匹配的 ]，考虑过滤表达式内可能出现的引号与括号
      const end = findBracketEnd(path, i)
      const inner = path.slice(i + 1, end).trim()
      i = end + 1
      if (inner === '*') tokens.push({ wildcard: true })
      else if (inner.startsWith('?')) {
        const filter = parseFilter(inner)
        if (filter) tokens.push({ filter })
      } else if (inner.includes(':')) tokens.push({ slice: parseSlice(inner) })
      else if (/^-?\d+$/.test(inner)) tokens.push({ index: Number(inner) })
      else tokens.push({ key: inner.replace(/^['"]|['"]$/g, '') })
    } else {
      i += 1
    }
  }
  return tokens
}

/** 找到与 path[start]（'['）匹配的 ']'，跳过引号内内容 */
function findBracketEnd(path: string, start: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < path.length; i++) {
    const c = path[i]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return path.length
}

function parseSlice(inner: string): SliceSpec {
  const parts = inner.split(':')
  const num = (s: string): number | undefined => {
    const t = s.trim()
    return t === '' ? undefined : Number(t)
  }
  return { start: num(parts[0]), end: num(parts[1] ?? ''), step: num(parts[2] ?? '') }
}

function applySlice(arr: unknown[], spec: SliceSpec): unknown[] {
  const len = arr.length
  const step = spec.step ?? 1
  if (step === 0) return []
  let start = spec.start ?? (step > 0 ? 0 : len - 1)
  let end = spec.end ?? (step > 0 ? len : -len - 1)
  if (start < 0) start += len
  if (end < 0) end += len
  const out: unknown[] = []
  if (step > 0) {
    start = Math.max(0, start)
    end = Math.min(len, end)
    for (let i = start; i < end; i += step) out.push(arr[i])
  } else {
    start = Math.min(len - 1, start)
    end = Math.max(-1, end)
    for (let i = start; i > end; i += step) out.push(arr[i])
  }
  return out
}

const FILTER_RE = /^\?\(\s*@(?:\.([\w$.]+))?\s*(==|!=|>=|<=|>|<|=~)?\s*(.*?)\s*\)$/

function parseFilter(inner: string): FilterSpec | null {
  const m = inner.match(FILTER_RE)
  if (!m) return null
  const field = m[1] ?? ''
  const opRaw = m[2]
  const rhs = m[3]
  if (!opRaw) {
    // 仅存在性判断 [?(@.field)]
    return { field, op: 'exists' }
  }
  if (opRaw === '=~') {
    // 形如 /pattern/flags
    const rm = rhs.match(/^\/(.*)\/([a-z]*)$/)
    if (!rm) return null
    return { field, op: '=~', regex: new RegExp(rm[1], rm[2]) }
  }
  return { field, op: opRaw as FilterSpec['op'], value: parseLiteral(rhs) }
}

function parseLiteral(s: string): string | number | boolean | null {
  const t = s.trim()
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1)
  }
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (t !== '' && !isNaN(Number(t))) return Number(t)
  return t
}

function resolveField(item: unknown, field: string): unknown {
  if (field === '') return item
  let cur = item
  for (const part of field.split('.')) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[part]
    else return undefined
  }
  return cur
}

function evalFilter(item: unknown, filter: FilterSpec): boolean {
  const actual = resolveField(item, filter.field)
  switch (filter.op) {
    case 'exists':
      return actual !== undefined
    case '=~':
      return typeof actual === 'string' && filter.regex!.test(actual)
    case '==':
      return actual === filter.value
    case '!=':
      return actual !== filter.value
    case '>':
    case '>=':
    case '<':
    case '<=': {
      if (typeof actual !== 'number' || typeof filter.value !== 'number') return false
      if (filter.op === '>') return actual > filter.value
      if (filter.op === '>=') return actual >= filter.value
      if (filter.op === '<') return actual < filter.value
      return actual <= filter.value
    }
    default:
      return false
  }
}

function collectRecursive(node: unknown, key: string, out: unknown[]): void {
  if (node && typeof node === 'object') {
    if (!Array.isArray(node)) {
      const obj = node as Record<string, unknown>
      if (key in obj) out.push(obj[key])
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectRecursive(value, key, out)
    }
  }
}
