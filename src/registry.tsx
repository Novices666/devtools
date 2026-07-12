import type { ComponentType } from 'react'
import { JsonTool } from './tools/json'
import { YamlTool, CsvTool, XmlTool, TomlTool, SqlTool, JsonTypesTool } from './tools/formats'
import { Base64Tool, UrlTool, HtmlEntityTool, UnicodeTool, JwtTool } from './tools/encoding'
import { HashTool, HmacTool, AesTool, BcryptTool, PasswordTool, RsaTool } from './tools/crypto'
import { TimestampTool, CronTool, IdTool, SnowflakeTool } from './tools/time'
import { DiffTool, RegexTool, TextTransformTool } from './tools/text'
import { RadixTool, ColorTool, QrCodeTool } from './tools/convert'
import { MarkdownTool, MockTool, SubnetTool, UserAgentTool, ImageTool } from './tools/misc'

export type ToolCategory =
  | 'format'
  | 'encoding'
  | 'crypto'
  | 'time'
  | 'text'
  | 'convert'
  | 'misc'

export interface ToolMeta {
  id: string
  name: string
  category: ToolCategory
  keywords: string[]
  icon: string
  component: ComponentType
  priority?: 'P0' | 'P1' | 'P2'
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  format: '数据格式',
  encoding: '编码解码',
  crypto: '加密哈希',
  time: '时间编号',
  text: '文本处理',
  convert: '转换工具',
  misc: '其他工具',
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'format',
  'encoding',
  'crypto',
  'time',
  'text',
  'convert',
  'misc',
]

export const TOOLS: ToolMeta[] = [
  // ---------- 数据格式 ----------
  {
    id: 'json',
    name: 'JSON 工具',
    category: 'format',
    keywords: ['json', '格式化', '美化', '压缩', '校验', 'jsonpath', 'format', 'beautify', 'minify', '树'],
    icon: '{ }',
    component: JsonTool,
    priority: 'P0',
  },
  {
    id: 'json-types',
    name: 'JSON 转类型',
    category: 'format',
    keywords: ['json', 'typescript', 'interface', 'go', 'struct', 'java', 'kotlin', '类型', '生成'],
    icon: 'T',
    component: JsonTypesTool,
    priority: 'P1',
  },
  {
    id: 'yaml',
    name: 'YAML 工具',
    category: 'format',
    keywords: ['yaml', 'yml', 'json', '互转', '格式化', 'convert'],
    icon: 'Y',
    component: YamlTool,
    priority: 'P1',
  },
  {
    id: 'xml',
    name: 'XML 工具',
    category: 'format',
    keywords: ['xml', 'json', '互转', '格式化', 'convert'],
    icon: '</>',
    component: XmlTool,
    priority: 'P1',
  },
  {
    id: 'toml',
    name: 'TOML 工具',
    category: 'format',
    keywords: ['toml', 'json', '互转', '配置', 'config', 'convert'],
    icon: 'T=',
    component: TomlTool,
    priority: 'P2',
  },
  {
    id: 'csv',
    name: 'CSV 工具',
    category: 'format',
    keywords: ['csv', 'json', 'markdown', '表格', 'table', '互转'],
    icon: '⊞',
    component: CsvTool,
    priority: 'P2',
  },
  {
    id: 'sql',
    name: 'SQL 格式化',
    category: 'format',
    keywords: ['sql', '格式化', 'format', '美化', 'mysql', 'postgresql'],
    icon: 'DB',
    component: SqlTool,
    priority: 'P2',
  },
  // ---------- 编码解码 ----------
  {
    id: 'base64',
    name: 'Base64',
    category: 'encoding',
    keywords: ['base64', '编码', '解码', 'encode', 'decode', '图片', 'image', 'datauri'],
    icon: '64',
    component: Base64Tool,
    priority: 'P0',
  },
  {
    id: 'url',
    name: 'URL 编解码',
    category: 'encoding',
    keywords: ['url', 'encode', 'decode', '编码', '解码', 'query', '参数', 'uri'],
    icon: '://',
    component: UrlTool,
    priority: 'P0',
  },
  {
    id: 'html-entity',
    name: 'HTML 实体',
    category: 'encoding',
    keywords: ['html', '实体', 'entity', '转义', 'escape', 'unescape'],
    icon: '&',
    component: HtmlEntityTool,
    priority: 'P1',
  },
  {
    id: 'unicode',
    name: 'Unicode 转义',
    category: 'encoding',
    keywords: ['unicode', '中文', '转义', 'escape', '\\u', '序列'],
    icon: 'U+',
    component: UnicodeTool,
    priority: 'P1',
  },
  {
    id: 'jwt',
    name: 'JWT 解析',
    category: 'encoding',
    keywords: ['jwt', 'token', '解析', 'decode', 'jose', '签名', 'verify'],
    icon: 'JWT',
    component: JwtTool,
    priority: 'P1',
  },
  // ---------- 加密哈希 ----------
  {
    id: 'hash',
    name: '哈希计算',
    category: 'crypto',
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha512', '哈希', '摘要', '文件'],
    icon: '#',
    component: HashTool,
    priority: 'P0',
  },
  {
    id: 'hmac',
    name: 'HMAC',
    category: 'crypto',
    keywords: ['hmac', '密钥', 'key', 'sha256', '签名', 'mac'],
    icon: 'H',
    component: HmacTool,
    priority: 'P1',
  },
  {
    id: 'aes',
    name: 'AES 加解密',
    category: 'crypto',
    keywords: ['aes', '加密', '解密', 'encrypt', 'decrypt', '对称', 'cbc', 'ecb'],
    icon: 'AES',
    component: AesTool,
    priority: 'P1',
  },
  {
    id: 'rsa',
    name: 'RSA 加解密',
    category: 'crypto',
    keywords: ['rsa', '加密', '解密', 'encrypt', 'decrypt', '非对称', '密钥对', 'keypair', 'oaep', 'pem'],
    icon: 'RSA',
    component: RsaTool,
    priority: 'P2',
  },
  {
    id: 'bcrypt',
    name: 'bcrypt',
    category: 'crypto',
    keywords: ['bcrypt', '密码', 'password', 'hash', '校验', 'verify'],
    icon: 'B',
    component: BcryptTool,
    priority: 'P2',
  },
  {
    id: 'password',
    name: '随机密码',
    category: 'crypto',
    keywords: ['密码', 'password', '随机', 'random', 'token', '生成', 'generate'],
    icon: '***',
    component: PasswordTool,
    priority: 'P1',
  },
  // ---------- 时间编号 ----------
  {
    id: 'timestamp',
    name: '时间戳转换',
    category: 'time',
    keywords: ['时间戳', 'timestamp', 'unix', '时间', '日期', '时区', 'date', 'time'],
    icon: 'TS',
    component: TimestampTool,
    priority: 'P0',
  },
  {
    id: 'cron',
    name: 'Cron 表达式',
    category: 'time',
    keywords: ['cron', '定时', '表达式', 'crontab', '调度', 'schedule'],
    icon: '⏱',
    component: CronTool,
    priority: 'P1',
  },
  {
    id: 'id',
    name: 'ID 生成',
    category: 'time',
    keywords: ['uuid', 'ulid', 'nanoid', 'id', '生成', 'guid', '唯一'],
    icon: 'ID',
    component: IdTool,
    priority: 'P0',
  },
  {
    id: 'snowflake',
    name: '雪花 ID 解析',
    category: 'time',
    keywords: ['snowflake', '雪花', 'id', '解析', '时间戳', 'twitter'],
    icon: '❄',
    component: SnowflakeTool,
    priority: 'P2',
  },
  // ---------- 文本处理 ----------
  {
    id: 'diff',
    name: '文本对比',
    category: 'text',
    keywords: ['diff', '对比', '差异', 'compare', '文本', 'text'],
    icon: '±',
    component: DiffTool,
    priority: 'P1',
  },
  {
    id: 'regex',
    name: '正则测试',
    category: 'text',
    keywords: ['regex', '正则', '匹配', 'match', 'pattern', 'regexp', '表达式'],
    icon: '.*',
    component: RegexTool,
    priority: 'P0',
  },
  {
    id: 'text-transform',
    name: '文本转换',
    category: 'text',
    keywords: ['大小写', '命名', 'camelcase', 'snake', '去重', '排序', '统计', 'case', 'naming'],
    icon: 'Aa',
    component: TextTransformTool,
    priority: 'P1',
  },
  // ---------- 转换工具 ----------
  {
    id: 'radix',
    name: '进制转换',
    category: 'convert',
    keywords: ['进制', '二进制', '十六进制', 'binary', 'hex', 'radix', '转换', 'octal'],
    icon: '10',
    component: RadixTool,
    priority: 'P0',
  },
  {
    id: 'color',
    name: '颜色转换',
    category: 'convert',
    keywords: ['颜色', 'color', 'hex', 'rgb', 'hsl', 'hsv', '拾色器', 'picker'],
    icon: '#c',
    component: ColorTool,
    priority: 'P1',
  },
  {
    id: 'qrcode',
    name: '二维码',
    category: 'convert',
    keywords: ['二维码', 'qrcode', 'qr', '生成', '识别', 'scan'],
    icon: '▦',
    component: QrCodeTool,
    priority: 'P1',
  },
  // ---------- 其他工具 ----------
  {
    id: 'markdown',
    name: 'Markdown 预览',
    category: 'misc',
    keywords: ['markdown', 'md', '预览', 'preview', '渲染', 'render'],
    icon: 'M↓',
    component: MarkdownTool,
    priority: 'P1',
  },
  {
    id: 'mock',
    name: 'Mock 数据',
    category: 'misc',
    keywords: ['mock', '假数据', '测试数据', 'fake', '生成', '姓名', '手机号'],
    icon: 'Mk',
    component: MockTool,
    priority: 'P2',
  },
  {
    id: 'image',
    name: '图片工具',
    category: 'misc',
    keywords: ['图片', 'image', '压缩', 'compress', '格式转换', 'png', 'jpg', 'jpeg', 'webp', '缩放'],
    icon: 'IMG',
    component: ImageTool,
    priority: 'P2',
  },
  {
    id: 'subnet',
    name: 'IP 子网计算',
    category: 'misc',
    keywords: ['ip', '子网', 'subnet', 'cidr', '网络', 'netmask', '掩码'],
    icon: 'IP',
    component: SubnetTool,
    priority: 'P2',
  },
  {
    id: 'user-agent',
    name: 'UA 解析',
    category: 'misc',
    keywords: ['ua', 'useragent', 'user-agent', '浏览器', '解析', 'browser'],
    icon: 'UA',
    component: UserAgentTool,
    priority: 'P2',
  },
]

export const TOOL_MAP: Record<string, ToolMeta> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
)

/** 搜索工具：按名称、关键词、分类匹配 */
export function searchTools(query: string): ToolMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return TOOLS
  const terms = q.split(/\s+/)
  const scored = TOOLS.map((tool) => {
    const haystack = [
      tool.name.toLowerCase(),
      tool.id,
      CATEGORY_LABELS[tool.category],
      ...tool.keywords.map((k) => k.toLowerCase()),
    ].join(' ')
    let score = 0
    for (const term of terms) {
      if (tool.name.toLowerCase().includes(term)) score += 10
      else if (tool.keywords.some((k) => k.toLowerCase() === term)) score += 8
      else if (haystack.includes(term)) score += 3
      else return null
    }
    return { tool, score }
  }).filter((x): x is { tool: ToolMeta; score: number } => x !== null)
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.tool)
}
