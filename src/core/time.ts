// 时间戳转换与相对时间

export interface TimestampParts {
  iso: string
  local: string
  utc: string
  seconds: number
  millis: number
  relative: string
}

/** 将任意时间戳（秒或毫秒）或日期字符串解析 */
export function parseTimestamp(input: string): Date {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed)
    // 10 位=秒，13 位=毫秒；根据长度判断
    const ms = trimmed.length <= 10 ? num * 1000 : num
    return new Date(ms)
  }
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) throw new Error('无法解析的时间格式')
  return d
}

const RTF = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

/** 相对当前时间的可读描述 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime()
  const abs = Math.abs(diffMs)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ]
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      return RTF.format(Math.round(diffMs / ms), unit)
    }
  }
  return '刚刚'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 常用 IANA 时区列表（覆盖各大洲主要城市），供时区下拉使用 */
export const COMMON_TIMEZONES: Array<{ zone: string; label: string }> = [
  { zone: 'UTC', label: 'UTC (协调世界时)' },
  { zone: 'Pacific/Midway', label: 'Midway (UTC-11)' },
  { zone: 'Pacific/Honolulu', label: 'Honolulu 檀香山 (UTC-10)' },
  { zone: 'America/Anchorage', label: 'Anchorage 安克雷奇 (UTC-9)' },
  { zone: 'America/Los_Angeles', label: 'Los Angeles 洛杉矶 (UTC-8/-7)' },
  { zone: 'America/Denver', label: 'Denver 丹佛 (UTC-7/-6)' },
  { zone: 'America/Chicago', label: 'Chicago 芝加哥 (UTC-6/-5)' },
  { zone: 'America/New_York', label: 'New York 纽约 (UTC-5/-4)' },
  { zone: 'America/Sao_Paulo', label: 'São Paulo 圣保罗 (UTC-3)' },
  { zone: 'Atlantic/Azores', label: 'Azores 亚速尔 (UTC-1)' },
  { zone: 'Europe/London', label: 'London 伦敦 (UTC+0/+1)' },
  { zone: 'Europe/Paris', label: 'Paris 巴黎 (UTC+1/+2)' },
  { zone: 'Europe/Berlin', label: 'Berlin 柏林 (UTC+1/+2)' },
  { zone: 'Europe/Moscow', label: 'Moscow 莫斯科 (UTC+3)' },
  { zone: 'Asia/Dubai', label: 'Dubai 迪拜 (UTC+4)' },
  { zone: 'Asia/Karachi', label: 'Karachi 卡拉奇 (UTC+5)' },
  { zone: 'Asia/Kolkata', label: 'Kolkata 加尔各答 (UTC+5:30)' },
  { zone: 'Asia/Dhaka', label: 'Dhaka 达卡 (UTC+6)' },
  { zone: 'Asia/Bangkok', label: 'Bangkok 曼谷 (UTC+7)' },
  { zone: 'Asia/Shanghai', label: 'Shanghai 上海 (UTC+8)' },
  { zone: 'Asia/Hong_Kong', label: 'Hong Kong 香港 (UTC+8)' },
  { zone: 'Asia/Taipei', label: 'Taipei 台北 (UTC+8)' },
  { zone: 'Asia/Singapore', label: 'Singapore 新加坡 (UTC+8)' },
  { zone: 'Asia/Tokyo', label: 'Tokyo 东京 (UTC+9)' },
  { zone: 'Asia/Seoul', label: 'Seoul 首尔 (UTC+9)' },
  { zone: 'Australia/Sydney', label: 'Sydney 悉尼 (UTC+10/+11)' },
  { zone: 'Pacific/Auckland', label: 'Auckland 奥克兰 (UTC+12/+13)' },
]

/** 返回运行环境支持的全部 IANA 时区（若不支持该 API 则回退到常用列表） */
export function listSupportedTimeZones(): string[] {
  try {
    const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    if (typeof anyIntl.supportedValuesOf === 'function') {
      return anyIntl.supportedValuesOf('timeZone')
    }
  } catch {
    /* 忽略，回退 */
  }
  return COMMON_TIMEZONES.map((t) => t.zone)
}

/** 本地时区名（如 Asia/Shanghai） */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 在指定时区格式化 */
export function formatInTimeZone(date: Date, timeZone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return fmt.format(date)
  } catch {
    return date.toISOString()
  }
}

export function describeTimestamp(date: Date, now: Date = new Date()): TimestampParts {
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return {
    iso: date.toISOString(),
    local,
    utc: date.toUTCString(),
    seconds: Math.floor(date.getTime() / 1000),
    millis: date.getTime(),
    relative: relativeTime(date, now),
  }
}
