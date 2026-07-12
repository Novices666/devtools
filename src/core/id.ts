// ID 生成：UUID v1/v4、ULID、NanoID、Snowflake 解析
import { ulid } from 'ulid'
import { nanoid, customAlphabet } from 'nanoid'

/** UUID v4（使用 crypto.randomUUID，回退到手写实现） */
export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

// UUID v1：基于时间戳 + 节点。为纯前端可用，节点/时钟序列随机生成。
let _v1Node: number[] | null = null
let _v1ClockSeq = Math.floor(Math.random() * 0x3fff)
let _v1Last = 0

export function uuidV1(): string {
  if (!_v1Node) {
    const nodeBytes = new Uint8Array(6)
    crypto.getRandomValues(nodeBytes)
    nodeBytes[0] |= 0x01 // multicast bit（随机节点约定）
    _v1Node = [...nodeBytes]
  }
  // 100 纳秒间隔自 1582-10-15 起
  const GREGORIAN_OFFSET = 122192928000000000n
  let now = Date.now()
  if (now <= _v1Last) {
    _v1ClockSeq = (_v1ClockSeq + 1) & 0x3fff
  }
  _v1Last = now
  const ts = BigInt(now) * 10000n + GREGORIAN_OFFSET
  const timeLow = Number(ts & 0xffffffffn)
  const timeMid = Number((ts >> 32n) & 0xffffn)
  const timeHi = Number((ts >> 48n) & 0x0fffn) | 0x1000
  const clockSeqHi = ((_v1ClockSeq >> 8) & 0x3f) | 0x80
  const clockSeqLow = _v1ClockSeq & 0xff
  const h = (n: number, len: number) => n.toString(16).padStart(len, '0')
  const node = _v1Node.map((b) => h(b, 2)).join('')
  return `${h(timeLow, 8)}-${h(timeMid, 4)}-${h(timeHi, 4)}-${h(clockSeqHi, 2)}${h(clockSeqLow, 2)}-${node}`
}

export function generateUuids(version: 'v1' | 'v4', count: number): string[] {
  const fn = version === 'v1' ? uuidV1 : uuidV4
  return Array.from({ length: Math.max(1, count) }, () => fn())
}

export function generateUlid(count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, () => ulid())
}

export function generateNanoId(count: number, size = 21, alphabet?: string): string[] {
  const gen = alphabet ? customAlphabet(alphabet, size) : () => nanoid(size)
  return Array.from({ length: Math.max(1, count) }, () => gen())
}

export interface SnowflakeParts {
  timestamp: number
  date: string
  datacenterId: number
  workerId: number
  sequence: number
}

/**
 * 解析雪花 ID（Twitter 标准布局）：
 * 1 符号位 + 41 时间戳 + 5 数据中心 + 5 机器 + 12 序列
 * epoch 默认 Twitter 起点 2010-11-04，可自定义
 */
export function parseSnowflake(id: string, epoch = 1288834974657): SnowflakeParts {
  const value = BigInt(id)
  const sequence = Number(value & 0xfffn)
  const workerId = Number((value >> 12n) & 0x1fn)
  const datacenterId = Number((value >> 17n) & 0x1fn)
  const timestamp = Number((value >> 22n) + BigInt(epoch))
  return {
    timestamp,
    date: new Date(timestamp).toISOString(),
    datacenterId,
    workerId,
    sequence,
  }
}
