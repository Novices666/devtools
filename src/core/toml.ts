// 轻量 TOML 解析 / 生成，无外部依赖
// 覆盖常见子集：键值对、[table]、[[array of tables]]、行内表 {}、数组 []、
// 字符串/整数/浮点/布尔/日期时间，# 注释

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

// ---------- 解析 ----------
export function tomlToJson(input: string, indent = 2): string {
  return JSON.stringify(parseToml(input), null, indent)
}

export function parseToml(input: string): Record<string, Json> {
  const root: Record<string, Json> = {}
  let current: Record<string, Json> = root
  const lines = input.split(/\r\n|\r|\n/)
  for (const raw of lines) {
    const line = stripComment(raw).trim()
    if (line === '') continue
    // 数组表 [[a.b]]
    if (line.startsWith('[[') && line.endsWith(']]')) {
      const path = parseKeyPath(line.slice(2, -2).trim())
      current = pushArrayTable(root, path)
      continue
    }
    // 表 [a.b]
    if (line.startsWith('[') && line.endsWith(']')) {
      const path = parseKeyPath(line.slice(1, -1).trim())
      current = ensureTable(root, path)
      continue
    }
    // 键值对
    const eq = findAssignment(line)
    if (eq === -1) throw new Error(`无法解析行：${raw.trim()}`)
    const keyRaw = line.slice(0, eq).trim()
    const valRaw = line.slice(eq + 1).trim()
    const keyPath = parseKeyPath(keyRaw)
    const value = parseValue(valRaw)
    assignKey(current, keyPath, value)
  }
  return root
}

function stripComment(line: string): string {
  let inStr: string | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inStr) {
      if (ch === inStr && line[i - 1] !== '\\') inStr = null
    } else if (ch === '"' || ch === "'") {
      inStr = ch
    } else if (ch === '#') {
      return line.slice(0, i)
    }
  }
  return line
}

function findAssignment(line: string): number {
  let inStr: string | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inStr) {
      if (ch === inStr && line[i - 1] !== '\\') inStr = null
    } else if (ch === '"' || ch === "'") {
      inStr = ch
    } else if (ch === '=') {
      return i
    }
  }
  return -1
}

/** 解析点分键路径，支持引号键 */
function parseKeyPath(s: string): string[] {
  const parts: string[] = []
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]
      i++
      let key = ''
      while (i < s.length && s[i] !== quote) key += s[i++]
      i++ // 跳过结束引号
      parts.push(key)
    } else {
      let key = ''
      while (i < s.length && s[i] !== '.' && !/\s/.test(s[i])) key += s[i++]
      if (key) parts.push(key)
    }
    while (i < s.length && /\s/.test(s[i])) i++
    if (s[i] === '.') i++
  }
  if (parts.length === 0) throw new Error('空键')
  return parts
}

function ensureTable(root: Record<string, Json>, path: string[]): Record<string, Json> {
  let node: Record<string, Json> = root
  for (const key of path) {
    let next = node[key]
    if (next === undefined) {
      next = {}
      node[key] = next
    } else if (Array.isArray(next)) {
      next = next[next.length - 1] as Record<string, Json>
    }
    node = next as Record<string, Json>
  }
  return node
}

function pushArrayTable(root: Record<string, Json>, path: string[]): Record<string, Json> {
  const parent = ensureTable(root, path.slice(0, -1))
  const key = path[path.length - 1]
  if (!Array.isArray(parent[key])) parent[key] = []
  const arr = parent[key] as Json[]
  const item: Record<string, Json> = {}
  arr.push(item)
  return item
}

function assignKey(table: Record<string, Json>, path: string[], value: Json): void {
  let node = table
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (node[key] === undefined) node[key] = {}
    node = node[key] as Record<string, Json>
  }
  node[path[path.length - 1]] = value
}

function parseValue(s: string): Json {
  s = s.trim()
  if (s === '') throw new Error('空值')
  // 数组
  if (s.startsWith('[')) return parseArray(s)
  // 行内表
  if (s.startsWith('{')) return parseInlineTable(s)
  // 字符串
  if (s.startsWith('"""') || s.startsWith("'''")) {
    return s.slice(3, s.length - 3).replace(/^\n/, '')
  }
  if (s.startsWith('"')) return unescapeStr(s.slice(1, -1))
  if (s.startsWith("'")) return s.slice(1, -1) // 字面量字符串不转义
  // 布尔
  if (s === 'true') return true
  if (s === 'false') return false
  // 日期时间（保留为字符串）
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}.*)?$/.test(s)) return s
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s
  // 数字
  const num = parseNumber(s)
  if (num !== undefined) return num
  throw new Error(`无法解析值：${s}`)
}

function parseNumber(s: string): number | undefined {
  const cleaned = s.replace(/_/g, '')
  if (/^[+-]?(0x[0-9a-fA-F]+)$/.test(cleaned)) return parseInt(cleaned, 16)
  if (/^[+-]?(0o[0-7]+)$/.test(cleaned)) return parseInt(cleaned.replace(/0o/, ''), 8)
  if (/^[+-]?(0b[01]+)$/.test(cleaned)) return parseInt(cleaned.replace(/0b/, ''), 2)
  if (/^[+-]?(inf)$/.test(cleaned)) return cleaned[0] === '-' ? -Infinity : Infinity
  if (/^[+-]?nan$/.test(cleaned)) return NaN
  if (/^[+-]?(\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(cleaned)) return Number(cleaned)
  return undefined
}

function unescapeStr(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (_, esc) => {
    switch (esc[0]) {
      case 'n': return '\n'
      case 't': return '\t'
      case 'r': return '\r'
      case '"': return '"'
      case '\\': return '\\'
      case 'b': return '\b'
      case 'f': return '\f'
      case 'u': return String.fromCodePoint(parseInt(esc.slice(1), 16))
      case 'U': return String.fromCodePoint(parseInt(esc.slice(1), 16))
      default: return esc
    }
  })
}

/** 将逗号分隔顶层元素切分（考虑嵌套与字符串） */
function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let inStr: string | null = null
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      buf += ch
      if (ch === inStr && s[i - 1] !== '\\') inStr = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = ch
      buf += ch
    } else if (ch === '[' || ch === '{') {
      depth++
      buf += ch
    } else if (ch === ']' || ch === '}') {
      depth--
      buf += ch
    } else if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts
}

function parseArray(s: string): Json[] {
  const inner = s.slice(1, -1).trim()
  if (inner === '') return []
  return splitTopLevel(inner).map(parseValue)
}

function parseInlineTable(s: string): Record<string, Json> {
  const inner = s.slice(1, -1).trim()
  const table: Record<string, Json> = {}
  if (inner === '') return table
  for (const pair of splitTopLevel(inner)) {
    const eq = findAssignment(pair)
    if (eq === -1) throw new Error(`行内表解析失败：${pair}`)
    const keyPath = parseKeyPath(pair.slice(0, eq).trim())
    assignKey(table, keyPath, parseValue(pair.slice(eq + 1).trim()))
  }
  return table
}

// ---------- 生成 ----------
export function jsonToToml(input: string): string {
  const data = JSON.parse(input)
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('TOML 顶层必须是对象')
  }
  return emitTable(data as Record<string, Json>, [])
}

function emitTable(table: Record<string, Json>, path: string[]): string {
  const scalars: string[] = []
  const tables: string[] = []
  for (const [key, value] of Object.entries(table)) {
    if (value === null || value === undefined) continue
    if (isTable(value)) {
      const childPath = [...path, key]
      tables.push(`[${childPath.map(quoteKey).join('.')}]\n` + emitTable(value as Record<string, Json>, childPath))
    } else if (Array.isArray(value) && value.every(isTable) && value.length > 0) {
      const childPath = [...path, key]
      for (const item of value) {
        tables.push(`[[${childPath.map(quoteKey).join('.')}]]\n` + emitTable(item as Record<string, Json>, childPath))
      }
    } else {
      scalars.push(`${quoteKey(key)} = ${emitValue(value)}`)
    }
  }
  const parts = [scalars.join('\n')]
  if (tables.length) parts.push(tables.join('\n'))
  return parts.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n')
}

function isTable(v: unknown): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function quoteKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`
}

function emitValue(value: Json): string {
  if (value === null) return '""'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return value > 0 ? 'inf' : Number.isNaN(value) ? 'nan' : '-inf'
    return String(value)
  }
  if (typeof value === 'string') return `"${escapeTomlStr(value)}"`
  if (Array.isArray(value)) return `[${value.map(emitValue).join(', ')}]`
  // 行内表
  const inner = Object.entries(value as Record<string, Json>)
    .map(([k, v]) => `${quoteKey(k)} = ${emitValue(v)}`)
    .join(', ')
  return `{ ${inner} }`
}

function escapeTomlStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
}
