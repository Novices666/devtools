// 格式互转：JSON ↔ YAML / CSV / XML / TOML，SQL 格式化，JSON → 类型定义
import yaml from 'js-yaml'

// ---------- YAML ----------
export function jsonToYaml(input: string): string {
  const data = JSON.parse(input)
  return yaml.dump(data, { indent: 2, lineWidth: -1 })
}

export function yamlToJson(input: string, indent = 2): string {
  const data = yaml.load(input)
  return JSON.stringify(data, null, indent)
}

export function formatYaml(input: string): string {
  const data = yaml.load(input)
  return yaml.dump(data, { indent: 2, lineWidth: -1 })
}

// ---------- CSV ----------
export interface CsvOptions {
  delimiter?: string
  header?: boolean
}

/** 解析 CSV 为二维数组，支持带引号字段与转义引号 */
export function parseCsv(input: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        field += ch
        i += 1
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i += 1
      } else if (ch === delimiter) {
        row.push(field)
        field = ''
        i += 1
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i += 1
      } else {
        field += ch
        i += 1
      }
    }
  }
  // 最后一个字段
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function csvToJson(input: string, options: CsvOptions = {}): string {
  const { delimiter = ',', header = true } = options
  const rows = parseCsv(input, delimiter)
  if (rows.length === 0) return '[]'
  if (header) {
    const keys = rows[0]
    const out = rows.slice(1).map((r) => {
      const obj: Record<string, string> = {}
      keys.forEach((k, idx) => {
        obj[k] = r[idx] ?? ''
      })
      return obj
    })
    return JSON.stringify(out, null, 2)
  }
  return JSON.stringify(rows, null, 2)
}

function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function jsonToCsv(input: string, delimiter = ','): string {
  const data = JSON.parse(input)
  if (!Array.isArray(data)) throw new Error('JSON 顶层必须是数组才能转 CSV')
  if (data.length === 0) return ''
  // 收集所有键
  const keys: string[] = []
  for (const item of data) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const k of Object.keys(item)) if (!keys.includes(k)) keys.push(k)
    }
  }
  const lines: string[] = []
  lines.push(keys.map((k) => escapeCsvField(k, delimiter)).join(delimiter))
  for (const item of data) {
    const obj = (item ?? {}) as Record<string, unknown>
    lines.push(
      keys
        .map((k) => {
          const v = obj[k]
          const s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
          return escapeCsvField(s, delimiter)
        })
        .join(delimiter),
    )
  }
  return lines.join('\n')
}

/** 解析 Markdown 表格为二维数组（含表头行） */
export function parseMarkdownTable(input: string): string[][] {
  const lines = input
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes('|'))
  if (lines.length === 0) return []
  const splitRow = (line: string): string[] => {
    // 去掉首尾管道，按未转义管道切分
    const s = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
    const cells: string[] = []
    let buf = ''
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && s[i + 1] === '|') {
        buf += '|'
        i++
      } else if (s[i] === '|') {
        cells.push(buf.trim())
        buf = ''
      } else {
        buf += s[i]
      }
    }
    cells.push(buf.trim())
    return cells
  }
  const rows = lines.map(splitRow)
  // 过滤分隔行（形如 ---|:--:|---）
  return rows.filter((r) => !r.every((c) => /^:?-{1,}:?$/.test(c) || c === ''))
}

/** Markdown 表格 → CSV */
export function markdownToCsv(input: string, delimiter = ','): string {
  const rows = parseMarkdownTable(input)
  if (rows.length === 0) return ''
  return rows.map((r) => r.map((c) => escapeCsvField(c, delimiter)).join(delimiter)).join('\n')
}

export function csvToMarkdown(input: string, options: CsvOptions = {}): string {
  const { delimiter = ',', header = true } = options
  const rows = parseCsv(input, delimiter)
  if (rows.length === 0) return ''
  const headerRow = header ? rows[0] : rows[0].map((_, i) => `列${i + 1}`)
  const bodyRows = header ? rows.slice(1) : rows
  const escapeMd = (s: string) => s.replace(/\|/g, '\\|')
  const lines: string[] = []
  lines.push('| ' + headerRow.map(escapeMd).join(' | ') + ' |')
  lines.push('| ' + headerRow.map(() => '---').join(' | ') + ' |')
  for (const r of bodyRows) {
    const cells = headerRow.map((_, i) => escapeMd(r[i] ?? ''))
    lines.push('| ' + cells.join(' | ') + ' |')
  }
  return lines.join('\n')
}

// ---------- XML ----------
export function jsonToXml(input: string, rootName = 'root'): string {
  const data = JSON.parse(input)
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + buildXml(rootName, data, 0)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildXml(name: string, value: unknown, depth: number): string {
  const pad = '  '.repeat(depth)
  if (value === null || value === undefined) {
    return `${pad}<${name}/>`
  }
  if (Array.isArray(value)) {
    return value.map((v) => buildXml(name, v, depth)).join('\n')
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => buildXml(sanitizeTag(k), v, depth + 1))
      .join('\n')
    return `${pad}<${name}>\n${inner}\n${pad}</${name}>`
  }
  return `${pad}<${name}>${escapeXml(String(value))}</${name}>`
}

function sanitizeTag(name: string): string {
  const cleaned = name.replace(/[^\w.-]/g, '_')
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : '_' + cleaned
}

// ---------- XML 解析（轻量，无外部依赖） ----------
interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

/** 将 XML 解析为节点树，出错时抛出带位置信息的异常 */
export function parseXml(input: string): XmlNode {
  // 去除声明、注释、CDATA 处理
  const xml = input.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const roots: XmlNode[] = []
  const stack: XmlNode[] = []
  let i = 0
  const len = xml.length
  while (i < len) {
    const lt = xml.indexOf('<', i)
    if (lt === -1) {
      // 尾部文本
      break
    }
    // 标签前文本
    if (lt > i) {
      const text = xml.slice(i, lt)
      if (text.trim() && stack.length) {
        stack[stack.length - 1].text += unescapeXml(text)
      }
    }
    // CDATA
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt)
      if (end === -1) throw new Error('CDATA 未闭合')
      const text = xml.slice(lt + 9, end)
      if (stack.length) stack[stack.length - 1].text += text
      i = end + 3
      continue
    }
    const gt = xml.indexOf('>', lt)
    if (gt === -1) throw new Error('标签未闭合（缺少 >）')
    const raw = xml.slice(lt + 1, gt).trim()
    if (raw.startsWith('/')) {
      // 闭合标签
      const tag = raw.slice(1).trim()
      const top = stack.pop()
      if (!top || top.tag !== tag) {
        throw new Error(`标签不匹配：期望闭合 </${top?.tag ?? '?'}>，实际 </${tag}>`)
      }
      if (stack.length === 0) roots.push(top)
      else stack[stack.length - 1].children.push(top)
    } else {
      const selfClose = raw.endsWith('/')
      const body = selfClose ? raw.slice(0, -1).trim() : raw
      const spaceIdx = body.search(/\s/)
      const tag = spaceIdx === -1 ? body : body.slice(0, spaceIdx)
      const attrStr = spaceIdx === -1 ? '' : body.slice(spaceIdx + 1)
      const node: XmlNode = { tag, attrs: parseAttrs(attrStr), children: [], text: '' }
      if (selfClose) {
        if (stack.length === 0) roots.push(node)
        else stack[stack.length - 1].children.push(node)
      } else {
        stack.push(node)
      }
    }
    i = gt + 1
  }
  if (stack.length) throw new Error(`标签未闭合：<${stack[stack.length - 1].tag}>`)
  if (roots.length === 0) throw new Error('未找到有效 XML 元素')
  return roots[0]
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const key = m[1] ?? m[3]
    const val = m[2] ?? m[4]
    attrs[key] = unescapeXml(val)
  }
  return attrs
}

/** XML → JSON（属性以 @ 前缀，文本以 #text 表示） */
export function xmlToJson(input: string, indent = 2): string {
  const root = parseXml(input)
  return JSON.stringify({ [root.tag]: nodeToValue(root) }, null, indent)
}

function nodeToValue(node: XmlNode): unknown {
  const hasAttrs = Object.keys(node.attrs).length > 0
  const hasChildren = node.children.length > 0
  const text = node.text.trim()
  if (!hasAttrs && !hasChildren) {
    return text === '' ? null : coerce(text)
  }
  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node.attrs)) obj['@' + k] = v
  // 按标签名分组子节点，重复标签合并为数组
  const groups: Record<string, unknown[]> = {}
  for (const child of node.children) {
    ;(groups[child.tag] ??= []).push(nodeToValue(child))
  }
  for (const [tag, arr] of Object.entries(groups)) {
    obj[tag] = arr.length === 1 ? arr[0] : arr
  }
  if (text !== '') obj['#text'] = coerce(text)
  return obj
}

function coerce(text: string): string | number | boolean {
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(text) && text.length < 16) {
    const n = Number(text)
    if (String(n) === text) return n
  }
  return text
}

/** 格式化 XML（重新缩进） */
export function formatXml(input: string, indent = 2): string {
  const root = parseXml(input)
  const pad = ' '.repeat(indent)
  return renderXml(root, 0, pad)
}

function renderXml(node: XmlNode, depth: number, pad: string): string {
  const p = pad.repeat(depth)
  const attrStr = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('')
  const text = node.text.trim()
  if (node.children.length === 0) {
    if (text === '') return `${p}<${node.tag}${attrStr}/>`
    return `${p}<${node.tag}${attrStr}>${escapeXml(text)}</${node.tag}>`
  }
  const inner = node.children.map((c) => renderXml(c, depth + 1, pad)).join('\n')
  const textLine = text ? `\n${pad.repeat(depth + 1)}${escapeXml(text)}` : ''
  return `${p}<${node.tag}${attrStr}>${textLine}\n${inner}\n${p}</${node.tag}>`
}

/** 压缩 XML（去除标签间空白） */
export function minifyXml(input: string): string {
  // 校验合法性
  parseXml(input)
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export interface XmlValidateResult {
  valid: boolean
  error?: string
}

/** 校验 XML 是否合法 */
export function validateXml(input: string): XmlValidateResult {
  if (input.trim() === '') return { valid: false, error: '输入为空' }
  try {
    parseXml(input)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: (e as Error).message }
  }
}

// ---------- SQL 格式化 ----------
export type SqlDialect = 'standard' | 'mysql' | 'postgresql' | 'sqlite'

/** 通用（各方言共有）关键字与子句 */
const SQL_KEYWORDS_COMMON = [
  'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'DELETE',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET',
  'UNION ALL', 'UNION', 'ON', 'AND', 'OR', 'AS', 'IN', 'NOT IN', 'LIKE',
  'BETWEEN', 'IS NULL', 'IS NOT NULL', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
  'DISTINCT', 'COUNT', 'DESC', 'ASC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
]

/** 方言专属关键字（用于大写归一，让方言特性也被正确格式化） */
const DIALECT_KEYWORDS: Record<SqlDialect, string[]> = {
  standard: [],
  mysql: [
    'REPLACE INTO', 'ON DUPLICATE KEY UPDATE', 'AUTO_INCREMENT', 'ENGINE',
    'UNSIGNED', 'ZEROFILL', 'STRAIGHT_JOIN', 'IGNORE', 'REGEXP', 'RLIKE',
  ],
  postgresql: [
    'RETURNING', 'ON CONFLICT', 'DO UPDATE', 'DO NOTHING', 'ILIKE', 'SIMILAR TO',
    'DISTINCT ON', 'LATERAL', 'WITH ORDINALITY', 'SERIAL', 'BIGSERIAL',
  ],
  sqlite: [
    'INSERT OR REPLACE', 'INSERT OR IGNORE', 'AUTOINCREMENT', 'PRAGMA',
    'WITHOUT ROWID', 'GLOB', 'ATTACH', 'DETACH',
  ],
}

const NEWLINE_BEFORE = new Set([
  'SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
  'CROSS JOIN', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'VALUES', 'SET', 'UNION ALL', 'UNION', 'AND', 'OR',
  // 方言子句也换行
  'RETURNING', 'ON CONFLICT', 'ON DUPLICATE KEY UPDATE',
])
const SQL_MASK_MARKER = '\uE000'

/** 轻量 SQL 美化：关键字大写并在主要子句前换行；按方言追加专属关键字 */
export function formatSql(input: string, uppercase = true, dialect: SqlDialect = 'standard'): string {
  // 归一空白
  let sql = input.replace(/\s+/g, ' ').trim()
  const keywords = [...SQL_KEYWORDS_COMMON, ...DIALECT_KEYWORDS[dialect]]
  // 关键字大写（长的优先，避免 JOIN 抢占 LEFT JOIN）
  const kwSorted = [...keywords].sort((a, b) => b.length - a.length)
  for (const kw of kwSorted) {
    const re = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi')
    sql = sql.replace(re, (m) => (uppercase ? kw : m.toLowerCase()))
  }
  // 保护含 AND/OR 的多词关键字，避免被换行规则拆开（如 INSERT OR REPLACE）
  const protectedKw = kwSorted.filter((k) => k.includes(' ') && /\b(AND|OR)\b/.test(k))
  const masks: string[] = []
  for (const kw of protectedKw) {
    const re = new RegExp(kw.replace(/ /g, '\\s+'), 'g')
    sql = sql.replace(re, () => {
      masks.push(kw)
      return `${SQL_MASK_MARKER}${masks.length - 1}${SQL_MASK_MARKER}`
    })
  }
  // 子句换行
  for (const kw of NEWLINE_BEFORE) {
    const re = new RegExp('\\s+(' + kw.replace(/ /g, '\\s+') + ')\\b', 'g')
    sql = sql.replace(re, '\n$1')
  }
  // AND / OR 缩进
  sql = sql.replace(/\n(AND|OR)\b/g, '\n  $1')
  // 还原被保护的关键字
  sql = sql.replace(new RegExp(`${SQL_MASK_MARKER}(\\d+)${SQL_MASK_MARKER}`, 'g'), (_, i) => masks[Number(i)])
  return sql.trim()
}

export function minifySql(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

// ---------- JSON → 类型定义 ----------
export type TargetLang = 'typescript' | 'go' | 'java' | 'kotlin'

export function jsonToTypes(input: string, lang: TargetLang, rootName = 'Root'): string {
  const data = JSON.parse(input)
  switch (lang) {
    case 'typescript':
      return jsonToTypeScript(data, rootName)
    case 'go':
      return jsonToGo(data, rootName)
    case 'java':
      return jsonToJava(data, rootName)
    case 'kotlin':
      return jsonToKotlin(data, rootName)
  }
}

function pascal(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

function sampleObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) return item as Record<string, unknown>
    }
    return null
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>
  return null
}

// TypeScript
function jsonToTypeScript(data: unknown, rootName: string): string {
  const interfaces: string[] = []
  const seen = new Set<string>()
  function tsType(value: unknown, name: string): string {
    if (value === null) return 'null'
    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]'
      const el = sampleObject(value)
      if (el) return `${genInterface(el, name)}[]`
      return `${tsType(value[0], name)}[]`
    }
    switch (typeof value) {
      case 'string': return 'string'
      case 'number': return 'number'
      case 'boolean': return 'boolean'
      case 'object': return genInterface(value as Record<string, unknown>, name)
      default: return 'unknown'
    }
  }
  function genInterface(obj: Record<string, unknown>, name: string): string {
    const typeName = pascal(name)
    if (!seen.has(typeName)) {
      seen.add(typeName)
      const fields = Object.entries(obj)
        .map(([k, v]) => {
          const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `'${k}'`
          return `  ${key}: ${tsType(v, k)}`
        })
        .join('\n')
      interfaces.push(`export interface ${typeName} {\n${fields}\n}`)
    }
    return typeName
  }
  const root = sampleObject(data)
  if (!root) return `export type ${pascal(rootName)} = ${tsType(data, rootName)}`
  genInterface(root, rootName)
  return interfaces.reverse().join('\n\n')
}

// Go
function jsonToGo(data: unknown, rootName: string): string {
  const structs: string[] = []
  const seen = new Set<string>()
  function goType(value: unknown, name: string): string {
    if (value === null) return 'interface{}'
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]interface{}'
      const el = sampleObject(value)
      if (el) return `[]${genStruct(el, name)}`
      return `[]${goType(value[0], name)}`
    }
    switch (typeof value) {
      case 'string': return 'string'
      case 'number': return Number.isInteger(value) ? 'int64' : 'float64'
      case 'boolean': return 'bool'
      case 'object': return genStruct(value as Record<string, unknown>, name)
      default: return 'interface{}'
    }
  }
  function genStruct(obj: Record<string, unknown>, name: string): string {
    const typeName = pascal(name)
    if (!seen.has(typeName)) {
      seen.add(typeName)
      const fields = Object.entries(obj)
        .map(([k, v]) => `\t${pascal(k)} ${goType(v, k)} \`json:"${k}"\``)
        .join('\n')
      structs.push(`type ${typeName} struct {\n${fields}\n}`)
    }
    return typeName
  }
  const root = sampleObject(data)
  if (!root) return `// 顶层非对象\ntype ${pascal(rootName)} ${goType(data, rootName)}`
  genStruct(root, rootName)
  return structs.reverse().join('\n\n')
}

// Java
function jsonToJava(data: unknown, rootName: string): string {
  const classes: string[] = []
  const seen = new Set<string>()
  function javaType(value: unknown, name: string): string {
    if (value === null) return 'Object'
    if (Array.isArray(value)) {
      if (value.length === 0) return 'List<Object>'
      const el = sampleObject(value)
      if (el) return `List<${genClass(el, name)}>`
      return `List<${boxed(javaType(value[0], name))}>`
    }
    switch (typeof value) {
      case 'string': return 'String'
      case 'number': return Number.isInteger(value) ? 'long' : 'double'
      case 'boolean': return 'boolean'
      case 'object': return genClass(value as Record<string, unknown>, name)
      default: return 'Object'
    }
  }
  function boxed(t: string): string {
    const map: Record<string, string> = { long: 'Long', double: 'Double', boolean: 'Boolean' }
    return map[t] ?? t
  }
  function genClass(obj: Record<string, unknown>, name: string): string {
    const typeName = pascal(name)
    if (!seen.has(typeName)) {
      seen.add(typeName)
      const fields = Object.entries(obj)
        .map(([k, v]) => `    private ${javaType(v, k)} ${camel(k)};`)
        .join('\n')
      classes.push(`public class ${typeName} {\n${fields}\n}`)
    }
    return typeName
  }
  const root = sampleObject(data)
  if (!root) return `// 顶层非对象`
  genClass(root, rootName)
  return classes.reverse().join('\n\n')
}

// Kotlin
function jsonToKotlin(data: unknown, rootName: string): string {
  const classes: string[] = []
  const seen = new Set<string>()
  function ktType(value: unknown, name: string): string {
    if (value === null) return 'Any?'
    if (Array.isArray(value)) {
      if (value.length === 0) return 'List<Any?>'
      const el = sampleObject(value)
      if (el) return `List<${genClass(el, name)}>`
      return `List<${ktType(value[0], name)}>`
    }
    switch (typeof value) {
      case 'string': return 'String'
      case 'number': return Number.isInteger(value) ? 'Long' : 'Double'
      case 'boolean': return 'Boolean'
      case 'object': return genClass(value as Record<string, unknown>, name)
      default: return 'Any?'
    }
  }
  function genClass(obj: Record<string, unknown>, name: string): string {
    const typeName = pascal(name)
    if (!seen.has(typeName)) {
      seen.add(typeName)
      const fields = Object.entries(obj)
        .map(([k, v]) => `    val ${camel(k)}: ${ktType(v, k)}`)
        .join(',\n')
      classes.push(`data class ${typeName}(\n${fields}\n)`)
    }
    return typeName
  }
  const root = sampleObject(data)
  if (!root) return `// 顶层非对象`
  genClass(root, rootName)
  return classes.reverse().join('\n\n')
}

function camel(name: string): string {
  const p = pascal(name)
  return p.charAt(0).toLowerCase() + p.slice(1)
}
