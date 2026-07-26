// 剪贴板 / 输入内容智能识别：根据文本特征推荐合适的工具

export interface DetectionResult {
  toolId: string
  label: string
  confidence: number // 0-1
}

function looksLikeJson(s: string): boolean {
  const t = s.trim()
  if (!((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']')))) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

/** 识别文本内容类型，返回按置信度排序的工具推荐 */
export function detectContent(input: string): DetectionResult[] {
  const s = input.trim()
  if (s === '') return []
  const results: DetectionResult[] = []
  const add = (toolId: string, label: string, confidence: number) => results.push({ toolId, label, confidence })

  // JWT：三段 base64url，以 eyJ 开头
  if (/^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+$/.test(s)) {
    add('jwt', 'JWT 令牌', 0.98)
  }

  // JSON
  if (looksLikeJson(s)) {
    add('json', 'JSON 数据', 0.95)
  }

  // URL / query string
  if (/^https?:\/\/\S+/i.test(s) || (/[?&][\w%]+=[^&\s]*/.test(s) && s.includes('='))) {
    add('url', 'URL / 查询串', /^https?:/i.test(s) ? 0.85 : 0.6)
  }

  // 时间戳（10 或 13 位数字）
  if (/^\d{10}$/.test(s) || /^\d{13}$/.test(s)) {
    add('timestamp', 'Unix 时间戳', 0.8)
  }

  // 颜色值
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) || /^(rgb|hsl)a?\([^)]+\)$/i.test(s)) {
    add('color', '颜色值', 0.9)
  }

  // 注意：不将纯十六进制/UUID 映射到哈希或 ID 生成工具——
  // 哈希工具用于「计算」摘要，ID 工具用于「生成」标识，均非解析类能力。

  // CIDR / IP
  if (/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(s)) {
    add('subnet', 'IP / CIDR', 0.85)
  }

  // User-Agent
  if (/^Mozilla\/\d/.test(s) && /(AppleWebKit|Gecko|Trident)/.test(s)) {
    add('user-agent', 'User-Agent', 0.9)
  }

  // XML
  if (/^<\?xml/.test(s) || (/^<[a-zA-Z][\w-]*[\s>]/.test(s) && /<\/[a-zA-Z]/.test(s))) {
    add('xml', 'XML 文档', 0.75)
  }

  // Base64（较长、字符集匹配）。排除纯十六进制短串（常见哈希形态，避免误路由到 Base 工具）
  const looksLikeHexDigest = /^(?:[0-9a-f]+|[0-9A-F]+)$/.test(s) && [32, 40, 64].includes(s.length)
  if (
    s.length >= 16 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(s) &&
    !looksLikeJson(s) &&
    !looksLikeHexDigest
  ) {
    add('base64', 'Base64 字符串', 0.5)
  }

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(s)) {
    add('sql', 'SQL 语句', 0.8)
  }

  // Cron 表达式（5 字段）
  if (/^(\S+\s+){4}\S+$/.test(s) && /[*/,\-0-9]/.test(s) && s.split(/\s+/).length === 5) {
    add('cron', 'Cron 表达式', 0.5)
  }

  results.sort((a, b) => b.confidence - a.confidence)
  return results
}
