// Cron 表达式解析（标准 5 字段：分 时 日 月 周）

interface CronField {
  values: number[]
  min: number
  max: number
}

const FIELD_RANGES: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6], // day of week (0=Sun)
]

function parseField(expr: string, min: number, max: number): CronField {
  const values = new Set<number>()
  for (const part of expr.split(',')) {
    let step = 1
    let range = part
    if (part.includes('/')) {
      const [r, s] = part.split('/')
      range = r
      step = Number(s)
      if (!Number.isInteger(step) || step <= 0) throw new Error(`非法步长: ${part}`)
    }
    let start = min
    let end = max
    if (range === '*') {
      // full range
    } else if (range.includes('-')) {
      const [a, b] = range.split('-').map(Number)
      if (isNaN(a) || isNaN(b)) throw new Error(`非法区间: ${part}`)
      start = a
      end = b
    } else {
      const n = Number(range)
      if (isNaN(n)) throw new Error(`非法字段: ${part}`)
      start = n
      end = n
    }
    if (start < min || end > max || start > end) throw new Error(`字段超出范围: ${part}`)
    for (let i = start; i <= end; i += step) values.add(i)
  }
  return { values: [...values].sort((a, b) => a - b), min, max }
}

export interface ParsedCron {
  fields: CronField[]
  description: string
}

const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function parseCron(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error('Cron 表达式必须为 5 个字段：分 时 日 月 周')
  const fields = parts.map((p, i) => parseField(p, FIELD_RANGES[i][0], FIELD_RANGES[i][1]))
  return { fields, description: describeCron(parts, fields) }
}

function describeCron(parts: string[], fields: CronField[]): string {
  const [min, hour, dom, mon, dow] = parts
  const pieces: string[] = []
  if (min === '*' && hour === '*') {
    pieces.push('每分钟')
  } else if (min !== '*' && hour !== '*' && fields[0].values.length === 1 && fields[1].values.length === 1) {
    pieces.push(`每天 ${String(fields[1].values[0]).padStart(2, '0')}:${String(fields[0].values[0]).padStart(2, '0')}`)
  } else {
    if (hour !== '*') pieces.push(`${hour} 时`)
    if (min !== '*') pieces.push(`${min} 分`)
    if (pieces.length === 0) pieces.push('每分钟')
  }
  if (dow !== '*') {
    pieces.push('于 ' + fields[4].values.map((d) => WEEK_NAMES[d]).join('、'))
  }
  if (dom !== '*') pieces.push(`每月 ${dom} 日`)
  if (mon !== '*') pieces.push(`${mon} 月`)
  return pieces.join(' ') + ' 执行'
}

/** 计算未来 N 次执行时间 */
export function nextExecutions(expr: string, count: number, from: Date = new Date()): Date[] {
  const { fields } = parseCron(expr)
  const [minutes, hours, doms, months, dows] = fields.map((f) => new Set(f.values))
  const results: Date[] = []
  const cursor = new Date(from.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)
  let guard = 0
  const maxIter = 366 * 24 * 60 // up to ~1 year of minutes
  while (results.length < count && guard < maxIter) {
    guard++
    if (
      minutes.has(cursor.getMinutes()) &&
      hours.has(cursor.getHours()) &&
      months.has(cursor.getMonth() + 1) &&
      doms.has(cursor.getDate()) &&
      dows.has(cursor.getDay())
    ) {
      results.push(new Date(cursor.getTime()))
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return results
}
