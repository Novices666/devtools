import { useEffect, useMemo, useState } from 'react'
import {
  ToolShell,
  Panel,
  Output,
  CopyButton,
  Button,
  ErrorHint,
  Select,
  TextInput,
} from '../components/ui'
import {
  parseTimestamp,
  describeTimestamp,
  formatInTimeZone,
  listSupportedTimeZones,
  localTimeZone,
} from '../core/time'
import { parseCron, nextExecutions } from '../core/cron'
import { generateUuids, generateUlid, generateNanoId, parseSnowflake, type SnowflakeParts } from '../core/id'
import { HistoryMenu } from '../components/HistoryMenu'

// ---------- 时间戳 ----------
export function TimestampTool() {
  const [input, setInput] = useState('')
  const [now, setNow] = useState(Date.now())
  const zones = useMemo(() => listSupportedTimeZones(), [])
  const [tz, setTz] = useState(() => localTimeZone())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsed = useMemo(() => {
    if (!input.trim()) return null
    try {
      const date = parseTimestamp(input)
      return { date, parts: describeTimestamp(date, new Date(now)), error: undefined as string | undefined }
    } catch (e) {
      return { date: null, parts: null, error: (e as Error).message }
    }
  }, [input, now])

  const rows: Array<[string, string]> = parsed?.parts
    ? [
        ['ISO 8601', parsed.parts.iso],
        ['本地时间', parsed.parts.local],
        ['UTC', parsed.parts.utc],
        ['秒级时间戳', String(parsed.parts.seconds)],
        ['毫秒级时间戳', String(parsed.parts.millis)],
        ['相对时间', parsed.parts.relative],
        [`时区 ${tz}`, parsed.date ? formatInTimeZone(parsed.date, tz) : ''],
      ]
    : []

  return (
    <ToolShell title="时间戳转换" description="Unix 时间戳 ↔ 日期时间，时区换算，相对时间">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-md bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-900/50">
          当前：<code className="font-mono">{Math.floor(now / 1000)}</code> 秒 / <code className="font-mono">{now}</code> 毫秒
        </div>
        <Button onClick={() => setInput(String(Math.floor(now / 1000)))}>填入当前秒</Button>
        <Button onClick={() => setInput(String(now))}>填入当前毫秒</Button>
        <Select
          value={tz}
          onChange={setTz}
          options={zones.map((z) => ({ label: z, value: z }))}
          className="ml-auto max-w-[16rem]"
        />
      </div>
      <div className="flex items-center gap-2">
        <TextInput value={input} onChange={setInput} placeholder="输入时间戳（秒/毫秒）或日期字符串，如 2026-07-09 12:00:00" className="w-full flex-1 font-mono" />
        <HistoryMenu toolId="timestamp" value={input} onRestore={setInput} />
      </div>
      <Panel title="解析结果">
        {parsed?.error ? (
          <ErrorHint message={parsed.error} />
        ) : (
          <div className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-semibold text-slate-500">{label}</span>
                <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-sm dark:bg-slate-900/50">{value}</code>
                <CopyButton text={value} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </ToolShell>
  )
}

// ---------- Cron ----------
export function CronTool() {
  const [expr, setExpr] = useState('0 8 * * 1-5')
  const [count, setCount] = useState(10)

  const result = useMemo(() => {
    try {
      const parsed = parseCron(expr)
      const next = nextExecutions(expr, count)
      return { description: parsed.description, next, error: undefined as string | undefined }
    } catch (e) {
      return { description: '', next: [], error: (e as Error).message }
    }
  }, [expr, count])

  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  return (
    <ToolShell title="Cron 表达式" description="解析标准 5 字段 Cron（分 时 日 月 周），预测执行时间">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput value={expr} onChange={setExpr} placeholder="分 时 日 月 周，如 0 8 * * 1-5" className="flex-1 font-mono" />
        <Select value={String(count)} onChange={(v) => setCount(Number(v))} options={[5, 10, 20, 50].map((n) => ({ label: `未来 ${n} 次`, value: String(n) }))} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[
          ['每分钟', '* * * * *'],
          ['每小时', '0 * * * *'],
          ['每天 0 点', '0 0 * * *'],
          ['工作日 8 点', '0 8 * * 1-5'],
          ['每 15 分钟', '*/15 * * * *'],
          ['每周一 9:30', '30 9 * * 1'],
        ].map(([label, val]) => (
          <Button key={val} onClick={() => setExpr(val)}>{label}</Button>
        ))}
      </div>
      {result.error ? (
        <ErrorHint message={result.error} />
      ) : (
        <>
          <div className="rounded-md bg-sky-500/10 px-3 py-2 text-sm text-sky-700 dark:text-sky-300">
            释义：{result.description}
          </div>
          <Panel title={`未来 ${result.next.length} 次执行`} className="min-h-0 flex-1">
            <div className="min-h-0 flex-1 space-y-1 overflow-auto">
              {result.next.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 shrink-0 text-xs text-slate-400">{i + 1}</span>
                  <code className="font-mono">{fmt(d)}</code>
                  <span className="text-xs text-slate-400">{['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}</span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </ToolShell>
  )
}

// ---------- ID 生成 ----------
type IdKind = 'uuidv4' | 'uuidv1' | 'ulid' | 'nanoid'

export function IdTool() {
  const [kind, setKind] = useState<IdKind>('uuidv4')
  const [count, setCount] = useState(5)
  const [nanoSize, setNanoSize] = useState(21)
  const [ids, setIds] = useState<string[]>([])

  function gen() {
    switch (kind) {
      case 'uuidv4':
        setIds(generateUuids('v4', count))
        break
      case 'uuidv1':
        setIds(generateUuids('v1', count))
        break
      case 'ulid':
        setIds(generateUlid(count))
        break
      case 'nanoid':
        setIds(generateNanoId(count, nanoSize))
        break
    }
  }

  return (
    <ToolShell title="ID 生成" description="UUID v1/v4、ULID、NanoID 批量生成">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onChange={setKind} options={[
          { label: 'UUID v4', value: 'uuidv4' },
          { label: 'UUID v1', value: 'uuidv1' },
          { label: 'ULID', value: 'ulid' },
          { label: 'NanoID', value: 'nanoid' },
        ]} />
        <Select value={String(count)} onChange={(v) => setCount(Number(v))} options={[1, 5, 10, 20, 50, 100].map((n) => ({ label: `${n} 个`, value: String(n) }))} />
        {kind === 'nanoid' && (
          <label className="flex items-center gap-1 text-sm text-slate-500">
            长度
            <input type="number" min={4} max={64} value={nanoSize} onChange={(e) => setNanoSize(Number(e.target.value))} className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800" />
          </label>
        )}
        <Button variant="primary" onClick={gen}>生成</Button>
        <CopyButton text={ids.join('\n')} label="复制全部" />
      </div>
      <Panel title={`结果（${ids.length}）`} className="min-h-0 flex-1">
        <Output value={ids.join('\n')} />
      </Panel>
    </ToolShell>
  )
}

// ---------- 雪花 ID 解析 ----------
export function SnowflakeTool() {
  const [id, setId] = useState('')
  const [epoch, setEpoch] = useState('1288834974657')
  const parsed = useMemo(() => {
    if (!id.trim()) return null
    try {
      return { data: parseSnowflake(id.trim(), Number(epoch)), error: undefined as string | undefined }
    } catch (e) {
      return { data: null as SnowflakeParts | null, error: (e as Error).message }
    }
  }, [id, epoch])

  return (
    <ToolShell title="雪花 ID 解析" description="拆解 Snowflake ID 的时间戳、数据中心、机器 ID、序列号">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput value={id} onChange={setId} placeholder="输入雪花 ID，如 1288834974657000000" className="flex-1 font-mono" />
        <label className="flex items-center gap-1 text-sm text-slate-500">
          epoch
          <TextInput value={epoch} onChange={setEpoch} className="w-40 font-mono" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => setEpoch('1288834974657')}>Twitter (2010)</Button>
        <Button onClick={() => setEpoch('1420041600000')}>2015-01-01</Button>
        <Button onClick={() => setEpoch('0')}>Unix epoch</Button>
      </div>
      <Panel title="解析结果">
        {parsed?.error ? (
          <ErrorHint message={parsed.error} />
        ) : parsed?.data ? (
          <div className="space-y-2">
            {([
              ['时间戳 (ms)', String(parsed.data.timestamp)],
              ['日期时间', parsed.data.date],
              ['数据中心 ID', String(parsed.data.datacenterId)],
              ['机器 ID', String(parsed.data.workerId)],
              ['序列号', String(parsed.data.sequence)],
            ] as Array<[string, string]>).map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-semibold text-slate-500">{label}</span>
                <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-sm dark:bg-slate-900/50">{value}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">输入雪花 ID 查看解析结果</p>
        )}
      </Panel>
    </ToolShell>
  )
}
