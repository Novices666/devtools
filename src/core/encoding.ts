// 编码 / 解码相关纯函数

// ---------- 通用 Base 编码 ----------

export type BaseEncoding =
  | 'base16'
  | 'base32'
  | 'base36'
  | 'base58'
  | 'base62'
  | 'base64'
  | 'base64url'
  | 'ascii85'

export type CharacterEncoding =
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'utf-32le'
  | 'utf-32be'
  | 'iso-8859-1'
  | 'ascii'

export const BASE_ENCODING_OPTIONS: Array<{ value: BaseEncoding; label: string }> = [
  { value: 'base16', label: 'Base16 (HEX)' },
  { value: 'base32', label: 'Base32' },
  { value: 'base36', label: 'Base36' },
  { value: 'base58', label: 'Base58 (Bitcoin)' },
  { value: 'base62', label: 'Base62' },
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'Base64 URL' },
  { value: 'ascii85', label: 'ASCII85' },
]

export const CHARACTER_ENCODING_OPTIONS: Array<{ value: CharacterEncoding; label: string }> = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'utf-16le', label: 'UTF-16 LE' },
  { value: 'utf-16be', label: 'UTF-16 BE' },
  { value: 'utf-32le', label: 'UTF-32 LE' },
  { value: 'utf-32be', label: 'UTF-32 BE' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'ascii', label: 'ASCII' },
]

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const MAX_RADIX_BYTES = 4096

/** 按指定字符集将文本编码为字节，不写入 BOM。 */
export function textToBytes(text: string, encoding: CharacterEncoding = 'utf-8'): Uint8Array {
  switch (encoding) {
    case 'utf-8':
      return new TextEncoder().encode(text)
    case 'utf-16le':
      return encodeUtf16(text, true)
    case 'utf-16be':
      return encodeUtf16(text, false)
    case 'utf-32le':
      return encodeUtf32(text, true)
    case 'utf-32be':
      return encodeUtf32(text, false)
    case 'iso-8859-1':
      return encodeSingleByte(text, 0xff, 'ISO-8859-1')
    case 'ascii':
      return encodeSingleByte(text, 0x7f, 'ASCII')
  }
}

/** 按指定字符集将字节解码为文本。 */
export function bytesToText(bytes: Uint8Array, encoding: CharacterEncoding = 'utf-8'): string {
  switch (encoding) {
    case 'utf-8':
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    case 'utf-16le':
      return decodeUtf16(bytes, true)
    case 'utf-16be':
      return decodeUtf16(bytes, false)
    case 'utf-32le':
      return decodeUtf32(bytes, true)
    case 'utf-32be':
      return decodeUtf32(bytes, false)
    case 'iso-8859-1':
      return codeUnitsToString(Array.from(bytes))
    case 'ascii':
      if (bytes.some((byte) => byte > 0x7f)) throw new Error('字节数据不是合法的 ASCII')
      return codeUnitsToString(Array.from(bytes))
  }
}

function encodeUtf16(text: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++) {
    const value = text.charCodeAt(i)
    bytes[i * 2 + (littleEndian ? 0 : 1)] = value & 0xff
    bytes[i * 2 + (littleEndian ? 1 : 0)] = value >>> 8
  }
  return bytes
}

function decodeUtf16(bytes: Uint8Array, littleEndian: boolean): string {
  if (bytes.length % 2 !== 0) throw new Error('UTF-16 字节长度必须是 2 的倍数')
  const units = new Array<number>(bytes.length / 2)
  for (let i = 0; i < units.length; i++) {
    units[i] = littleEndian
      ? bytes[i * 2] | (bytes[i * 2 + 1] << 8)
      : (bytes[i * 2] << 8) | bytes[i * 2 + 1]
  }
  return codeUnitsToString(units)
}

function encodeUtf32(text: string, littleEndian: boolean): Uint8Array {
  const codePoints = Array.from(text, (ch) => ch.codePointAt(0)!)
  const bytes = new Uint8Array(codePoints.length * 4)
  codePoints.forEach((value, index) => {
    for (let byte = 0; byte < 4; byte++) {
      const shift = littleEndian ? byte * 8 : (3 - byte) * 8
      bytes[index * 4 + byte] = (value >>> shift) & 0xff
    }
  })
  return bytes
}

function decodeUtf32(bytes: Uint8Array, littleEndian: boolean): string {
  if (bytes.length % 4 !== 0) throw new Error('UTF-32 字节长度必须是 4 的倍数')
  let out = ''
  for (let i = 0; i < bytes.length; i += 4) {
    const value = littleEndian
      ? bytes[i] + bytes[i + 1] * 0x100 + bytes[i + 2] * 0x10000 + bytes[i + 3] * 0x1000000
      : bytes[i] * 0x1000000 + bytes[i + 1] * 0x10000 + bytes[i + 2] * 0x100 + bytes[i + 3]
    if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
      throw new Error('UTF-32 包含无效的 Unicode 码点')
    }
    out += String.fromCodePoint(value)
  }
  return out
}

function encodeSingleByte(text: string, max: number, label: string): Uint8Array {
  const bytes: number[] = []
  for (const ch of text) {
    const value = ch.codePointAt(0)!
    if (value > max) throw new Error(`${label} 无法表示字符: ${ch}`)
    bytes.push(value)
  }
  return Uint8Array.from(bytes)
}

function codeUnitsToString(units: number[]): string {
  let out = ''
  for (let i = 0; i < units.length; i += 8192) out += String.fromCharCode(...units.slice(i, i + 8192))
  return out
}

/** 将字节数组转换为所选 Base 表示。 */
export function encodeBase(bytes: Uint8Array, encoding: BaseEncoding): string {
  switch (encoding) {
    case 'base16':
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    case 'base32':
      return encodeBase32(bytes)
    case 'base36':
      return encodeRadixBytes(bytes, BASE36_ALPHABET, 'Base36')
    case 'base58':
      return encodeRadixBytes(bytes, BASE58_ALPHABET, 'Base58')
    case 'base62':
      return encodeRadixBytes(bytes, BASE62_ALPHABET, 'Base62')
    case 'base64':
      return bytesToBase64(bytes)
    case 'base64url':
      return bytesToBase64(bytes, true)
    case 'ascii85':
      return encodeAscii85(bytes)
  }
}

/** 将所选 Base 表示还原为字节数组。 */
export function decodeBase(input: string, encoding: BaseEncoding): Uint8Array {
  switch (encoding) {
    case 'base16':
      return decodeBase16(input)
    case 'base32':
      return decodeBase32(input)
    case 'base36':
      return decodeRadixBytes(input.toUpperCase(), BASE36_ALPHABET, 'Base36')
    case 'base58':
      return decodeRadixBytes(input, BASE58_ALPHABET, 'Base58')
    case 'base62':
      return decodeRadixBytes(input, BASE62_ALPHABET, 'Base62')
    case 'base64':
      return decodeBase64Strict(input, false)
    case 'base64url':
      return decodeBase64Strict(input, true)
    case 'ascii85':
      return decodeAscii85(input)
  }
}

export function textToBase(
  text: string,
  base: BaseEncoding,
  characterEncoding: CharacterEncoding = 'utf-8',
): string {
  return encodeBase(textToBytes(text, characterEncoding), base)
}

export function baseToText(
  input: string,
  base: BaseEncoding,
  characterEncoding: CharacterEncoding = 'utf-8',
): string {
  return bytesToText(decodeBase(input, base), characterEncoding)
}

function decodeBase16(input: string): Uint8Array {
  const normalized = input.replace(/\s/g, '').replace(/^0x/i, '')
  if (normalized.length % 2 !== 0) throw new Error('Base16 必须包含偶数个十六进制字符')
  if (!/^[0-9a-f]*$/i.test(normalized)) throw new Error('Base16 包含非法字符')
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function encodeBase32(bytes: Uint8Array): string {
  let out = ''
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += BASE32_ALPHABET[(buffer >>> bits) & 31]
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(buffer << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}

function decodeBase32(input: string): Uint8Array {
  const normalized = input.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z2-7]*={0,6}$/.test(normalized)) throw new Error('Base32 包含非法字符或填充')
  const body = normalized.replace(/=+$/, '')
  if (body.includes('=')) throw new Error('Base32 填充只能位于末尾')
  const remainder = body.length % 8
  if (![0, 2, 4, 5, 7].includes(remainder)) throw new Error('Base32 长度无效')
  const paddingLength = normalized.length - body.length
  if (paddingLength > 0 && (normalized.length % 8 !== 0 || paddingLength !== 8 - remainder)) {
    throw new Error('Base32 填充长度无效')
  }
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of body) {
    buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >>> bits) & 0xff)
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) throw new Error('Base32 末尾包含无效数据')
  return Uint8Array.from(bytes)
}

function encodeRadixBytes(bytes: Uint8Array, alphabet: string, label: string): string {
  if (bytes.length === 0) return ''
  if (bytes.length > MAX_RADIX_BYTES) {
    throw new Error(`${label} 适用于短数据，输入不能超过 ${MAX_RADIX_BYTES} 字节`)
  }
  let zeroCount = 0
  while (zeroCount < bytes.length && bytes[zeroCount] === 0) zeroCount++
  const digits = [0]
  for (let i = zeroCount; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % alphabet.length
      carry = Math.floor(carry / alphabet.length)
    }
    while (carry > 0) {
      digits.push(carry % alphabet.length)
      carry = Math.floor(carry / alphabet.length)
    }
  }
  let out = alphabet[0].repeat(zeroCount)
  if (zeroCount < bytes.length) {
    for (let i = digits.length - 1; i >= 0; i--) out += alphabet[digits[i]]
  }
  return out
}

function decodeRadixBytes(input: string, alphabet: string, label: string): Uint8Array {
  const normalized = input.replace(/\s/g, '')
  if (normalized === '') return new Uint8Array()
  const maxEncodedLength = Math.ceil(MAX_RADIX_BYTES * Math.log(256) / Math.log(alphabet.length))
  if (normalized.length > maxEncodedLength) {
    throw new Error(`${label} 适用于短数据，编码内容不能超过 ${maxEncodedLength} 个字符`)
  }
  const indexes = new Map(Array.from(alphabet, (ch, index) => [ch, index]))
  let zeroCount = 0
  while (zeroCount < normalized.length && normalized[zeroCount] === alphabet[0]) zeroCount++
  const bytes = [0]
  for (let i = zeroCount; i < normalized.length; i++) {
    const value = indexes.get(normalized[i])
    if (value === undefined) throw new Error(`${label} 包含非法字符: ${normalized[i]}`)
    let carry = value
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * alphabet.length
      bytes[j] = carry & 0xff
      carry >>>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>>= 8
    }
  }
  const dataLength = zeroCount === normalized.length ? 0 : bytes.length
  const out = new Uint8Array(zeroCount + dataLength)
  for (let i = 0; i < dataLength; i++) out[out.length - 1 - i] = bytes[i]
  return out
}

function decodeBase64Strict(input: string, urlSafe: boolean): Uint8Array {
  const normalized = input.replace(/\s/g, '')
  const chars = urlSafe ? /^[A-Za-z0-9_-]*={0,2}$/ : /^[A-Za-z0-9+/]*={0,2}$/
  if (!chars.test(normalized)) throw new Error(`${urlSafe ? 'Base64 URL' : 'Base64'} 包含非法字符`)
  const body = normalized.replace(/=+$/, '')
  if (body.length % 4 === 1) throw new Error('Base64 长度无效')
  if (normalized.length !== body.length && normalized.length % 4 !== 0) throw new Error('Base64 填充长度无效')
  return base64ToBytes(urlSafe ? body : normalized)
}

function encodeAscii85(bytes: Uint8Array): string {
  let out = ''
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const length = Math.min(4, bytes.length - offset)
    let value = 0
    for (let i = 0; i < 4; i++) value = value * 256 + (i < length ? bytes[offset + i] : 0)
    if (length === 4 && value === 0) {
      out += 'z'
      continue
    }
    const chars = new Array<string>(5)
    for (let i = 4; i >= 0; i--) {
      chars[i] = String.fromCharCode((value % 85) + 33)
      value = Math.floor(value / 85)
    }
    out += chars.slice(0, length + 1).join('')
  }
  return out
}

function decodeAscii85(input: string): Uint8Array {
  let normalized = input.trim()
  if (normalized.startsWith('<~') && normalized.endsWith('~>')) normalized = normalized.slice(2, -2)
  normalized = normalized.replace(/\s/g, '')
  const bytes: number[] = []
  let group: number[] = []
  const flush = (partial: boolean) => {
    const originalLength = group.length
    if (partial && originalLength === 1) throw new Error('ASCII85 末尾分组长度无效')
    while (group.length < 5) group.push(84)
    let value = 0
    for (const digit of group) value = value * 85 + digit
    if (value > 0xffffffff) throw new Error('ASCII85 分组数值溢出')
    const count = partial ? originalLength - 1 : 4
    for (let i = 0; i < count; i++) bytes.push(Math.floor(value / 256 ** (3 - i)) & 0xff)
    group = []
  }
  for (const ch of normalized) {
    if (ch === 'z') {
      if (group.length !== 0) throw new Error('ASCII85 的 z 只能表示完整的零分组')
      bytes.push(0, 0, 0, 0)
      continue
    }
    const code = ch.charCodeAt(0)
    if (code < 33 || code > 117) throw new Error(`ASCII85 包含非法字符: ${ch}`)
    group.push(code - 33)
    if (group.length === 5) flush(false)
  }
  if (group.length > 0) flush(true)
  return Uint8Array.from(bytes)
}

// ---------- Base64 ----------

/** UTF-8 安全的 Base64 编码 */
export function textToBase64(text: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  let b64 = btoa(binary)
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return b64
}

/** UTF-8 安全的 Base64 解码 */
export function base64ToText(b64: string): string {
  let normalized = b64.replace(/-/g, '+').replace(/_/g, '/').trim()
  // 补齐 padding
  const pad = normalized.length % 4
  if (pad) normalized += '='.repeat(4 - pad)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** 将字节数组编码为 Base64 */
export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  let b64 = btoa(binary)
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return b64
}

/** Base64 解码为字节数组（兼容 URL-safe，自动补齐 padding） */
export function base64ToBytes(b64: string): Uint8Array {
  let normalized = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const pad = normalized.length % 4
  if (pad) normalized += '='.repeat(4 - pad)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 依据文件魔数识别常见图片类型，返回 MIME（无法识别返回 null） */
export function detectImageMime(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b.length >= 5 && b[0] === 0x3c && (b[1] === 0x3f || b[1] === 0x73)) {
    // '<?xml' 或 '<svg'
    return 'image/svg+xml'
  }
  return null
}

export interface Base64ImageResult {
  isImage: boolean
  dataUri?: string
  mime?: string
}

/** 判断 Base64 / data URI 是否为图片，返回可用于预览/下载的 data URI */
export function base64ToImage(input: string): Base64ImageResult {
  const trimmed = input.trim()
  // 已是 data URI
  const dataMatch = trimmed.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s)
  if (dataMatch) {
    return { isImage: true, dataUri: trimmed, mime: dataMatch[1] }
  }
  const raw = trimmed.replace(/^data:[^,]*,/, '')
  try {
    const bytes = base64ToBytes(raw)
    const mime = detectImageMime(bytes)
    if (mime) {
      return { isImage: true, dataUri: `data:${mime};base64,${bytesToBase64(bytes)}`, mime }
    }
  } catch {
    /* 非法 base64 */
  }
  return { isImage: false }
}

// ---------- URL ----------

export function urlEncode(text: string, component = true): string {
  return component ? encodeURIComponent(text) : encodeURI(text)
}

export function urlDecode(text: string, component = true): string {
  return component ? decodeURIComponent(text) : decodeURI(text)
}

export interface QueryParam {
  key: string
  value: string
}

/** 解析 query string 为键值对（支持带或不带 ? / 完整 URL） */
export function parseQueryString(input: string): QueryParam[] {
  let qs = input.trim()
  const qIdx = qs.indexOf('?')
  if (qIdx >= 0) qs = qs.slice(qIdx + 1)
  const hashIdx = qs.indexOf('#')
  if (hashIdx >= 0) qs = qs.slice(0, hashIdx)
  if (!qs) return []
  return qs.split('&').map((pair) => {
    const eq = pair.indexOf('=')
    if (eq < 0) return { key: safeDecode(pair), value: '' }
    return {
      key: safeDecode(pair.slice(0, eq)),
      value: safeDecode(pair.slice(eq + 1)),
    }
  })
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

/** 由键值对重新拼接 query string */
export function buildQueryString(params: QueryParam[]): string {
  return params
    .filter((p) => p.key !== '')
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')
}

// ---------- HTML 实体 ----------

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c])
}

export function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&') // 最后处理 &，避免二次解码
}

// ---------- Unicode / 转义 ----------

/** 中文（及非 ASCII）转 \uXXXX */
export function toUnicodeEscape(text: string, allChars = false): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (!allChars && code < 128) {
      out += ch
    } else if (code > 0xffff) {
      // 需要代理对
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800
      const low = ((code - 0x10000) % 0x400) + 0xdc00
      out += '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0')
    } else {
      out += '\\u' + code.toString(16).padStart(4, '0')
    }
  }
  return out
}

/** \uXXXX 转回字符 */
export function fromUnicodeEscape(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** 处理常见转义序列 \n \t \r 等 -> 实际字符 */
export function unescapeString(text: string): string {
  return text.replace(/\\([nrtbf0'"\\/]|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})/g, (m, g) => {
    switch (g[0]) {
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 't':
        return '\t'
      case 'b':
        return '\b'
      case 'f':
        return '\f'
      case '0':
        return '\0'
      case "'":
        return "'"
      case '"':
        return '"'
      case '\\':
        return '\\'
      case '/':
        return '/'
      case 'u':
        return String.fromCharCode(parseInt(g.slice(1), 16))
      case 'x':
        return String.fromCharCode(parseInt(g.slice(1), 16))
      default:
        return m
    }
  })
}

/** 实际字符 -> 转义序列 */
export function escapeString(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/[\b]/g, '\\b') // [\b] 是退格符，/\b/ 会被解释为单词边界
}
