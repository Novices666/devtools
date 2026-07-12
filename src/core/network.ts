// 网络工具：IP/子网(CIDR)计算、User-Agent 解析

export interface SubnetInfo {
  valid: boolean
  error?: string
  address: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  hostCount: number
  usableHostCount: number
  ipClass: string
  isPrivate: boolean
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const v = Number(p)
    if (v < 0 || v > 255) return null
    n = (n << 8) | v
  }
  return n >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function ipClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A'
  if (firstOctet < 192) return 'B'
  if (firstOctet < 224) return 'C'
  if (firstOctet < 240) return 'D (组播)'
  return 'E (保留)'
}

function isPrivateIp(n: number): boolean {
  const a = (n >>> 24) & 255
  const b = (n >>> 16) & 255
  // 10.0.0.0/8
  if (a === 10) return true
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true
  return false
}

/** 解析 CIDR（如 192.168.1.10/24）或 IP，可单独给出 prefix */
export function calcSubnet(input: string, prefixOverride?: number): SubnetInfo {
  const empty: SubnetInfo = {
    valid: false,
    error: '',
    address: '',
    prefix: 0,
    netmask: '',
    wildcard: '',
    network: '',
    broadcast: '',
    firstHost: '',
    lastHost: '',
    hostCount: 0,
    usableHostCount: 0,
    ipClass: '',
    isPrivate: false,
  }
  const trimmed = input.trim()
  if (trimmed === '') return { ...empty, error: '输入为空' }
  let ipStr = trimmed
  let prefix = prefixOverride ?? 24
  if (trimmed.includes('/')) {
    const [ip, pfx] = trimmed.split('/')
    ipStr = ip.trim()
    if (!/^\d+$/.test(pfx.trim())) return { ...empty, error: '前缀长度无效' }
    prefix = Number(pfx.trim())
  } else if (prefixOverride !== undefined) {
    prefix = prefixOverride
  }
  if (prefix < 0 || prefix > 32) return { ...empty, error: '前缀长度需在 0-32 之间' }
  const ipInt = ipToInt(ipStr)
  if (ipInt === null) return { ...empty, error: '不是合法的 IPv4 地址' }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (ipInt & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const hostCount = prefix >= 31 ? 2 ** (32 - prefix) : 2 ** (32 - prefix)
  const usableHostCount = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, hostCount - 2)
  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0
  const firstOctet = (ipInt >>> 24) & 255

  return {
    valid: true,
    address: ipStr,
    prefix,
    netmask: intToIp(mask),
    wildcard: intToIp(~mask >>> 0),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    hostCount,
    usableHostCount,
    ipClass: ipClass(firstOctet),
    isPrivate: isPrivateIp(ipInt),
  }
}

// ---------- User-Agent 解析 ----------
export interface UserAgentInfo {
  browser: string
  browserVersion: string
  engine: string
  os: string
  osVersion: string
  device: string
  raw: string
}

export function parseUserAgent(ua: string): UserAgentInfo {
  const raw = ua.trim()
  const info: UserAgentInfo = {
    browser: '未知',
    browserVersion: '',
    engine: '未知',
    os: '未知',
    osVersion: '',
    device: '桌面',
    raw,
  }
  if (!raw) return info

  // 引擎
  if (/Gecko\/\d/.test(raw) && /Firefox/.test(raw)) info.engine = 'Gecko'
  else if (/AppleWebKit/.test(raw)) info.engine = 'WebKit/Blink'
  else if (/Trident/.test(raw)) info.engine = 'Trident'

  // 浏览器（顺序敏感）
  const browserMatchers: Array<[string, RegExp]> = [
    ['Edge', /Edg(?:e|iOS|A)?\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
    ['IE', /(?:MSIE |rv:)([\d.]+)/],
  ]
  for (const [name, re] of browserMatchers) {
    const m = raw.match(re)
    if (m) {
      info.browser = name
      info.browserVersion = m[1]
      break
    }
  }

  // 操作系统
  if (/Windows NT ([\d.]+)/.test(raw)) {
    info.os = 'Windows'
    const v = raw.match(/Windows NT ([\d.]+)/)![1]
    const map: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    }
    info.osVersion = map[v] ?? v
  } else if (/Android ([\d.]+)/.test(raw)) {
    info.os = 'Android'
    info.osVersion = raw.match(/Android ([\d.]+)/)![1]
    info.device = '移动'
  } else if (/iPhone|iPad|iPod/.test(raw)) {
    info.os = 'iOS'
    const m = raw.match(/OS (\d+[_\d]*)/)
    if (m) info.osVersion = m[1].replace(/_/g, '.')
    info.device = /iPad/.test(raw) ? '平板' : '移动'
  } else if (/Mac OS X ([\d_.]+)/.test(raw)) {
    info.os = 'macOS'
    info.osVersion = raw.match(/Mac OS X ([\d_.]+)/)![1].replace(/_/g, '.')
  } else if (/Linux/.test(raw)) {
    info.os = 'Linux'
  }

  if (/Mobile|Android|iPhone|iPod/.test(raw) && info.device === '桌面') info.device = '移动'

  return info
}
