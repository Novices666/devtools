// 编码 / 解码相关纯函数

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
