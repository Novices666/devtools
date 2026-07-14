import { useMemo, useState } from 'react'
import {
  ToolShell,
  TwoPane,
  Panel,
  TextArea,
  Output,
  CopyButton,
  Button,
  Segmented,
  ErrorHint,
  Checkbox,
} from '../components/ui'
import {
  diffLines,
  diffStats,
  diffChars,
  diffJson,
  jsonDiffStats,
  testRegex,
  regexPresets,
  convertNamingAll,
  toUpperCase,
  toLowerCase,
  toTitleCase,
  toSentenceCase,
  processLines,
  textStats,
  type LineOps,
} from '../core/text'
import { HistoryMenu } from '../components/HistoryMenu'

// ---------------- 文本 Diff ----------------
type DiffMode = 'line' | 'char' | 'json'

export function DiffTool() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [mode, setMode] = useState<DiffMode>('line')

  const lineResult = useMemo(() => {
    if (mode !== 'line') return { diff: [], error: undefined as string | undefined }
    try {
      return { diff: diffLines(left, right), error: undefined as string | undefined }
    } catch (e) {
      return { diff: [], error: (e as Error).message }
    }
  }, [left, right, mode])
  const lineStats = useMemo(() => diffStats(lineResult.diff), [lineResult.diff])
  const charResult = useMemo(() => {
    if (mode !== 'char') return { diff: [], error: undefined as string | undefined }
    try {
      return { diff: diffChars(left, right), error: undefined as string | undefined }
    } catch (e) {
      return { diff: [], error: (e as Error).message }
    }
  }, [left, right, mode])
  const jsonResult = useMemo(() => {
    if (mode !== 'json' || (!left.trim() && !right.trim())) return null
    try {
      const entries = diffJson(left || 'null', right || 'null')
      return { entries, stats: jsonDiffStats(entries), error: undefined as string | undefined }
    } catch (e) {
      return { entries: [], stats: null, error: (e as Error).message }
    }
  }, [left, right, mode])

  return (
    <ToolShell title="文本 Diff 对比" description="行级 / 字符级 / JSON 结构化差异对比">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '行级', value: 'line' },
            { label: '字符级', value: 'char' },
            { label: 'JSON 结构化', value: 'json' },
          ]}
        />
        {mode === 'line' && !lineResult.error && (
          <>
            <span className="text-green-600 dark:text-green-400">+ 新增 {lineStats.added}</span>
            <span className="text-red-600 dark:text-red-400">- 删除 {lineStats.removed}</span>
            <span className="text-slate-500">= 未变 {lineStats.unchanged}</span>
          </>
        )}
        {mode === 'json' && jsonResult?.stats && (
          <>
            <span className="text-green-600 dark:text-green-400">+ 新增 {jsonResult.stats.added}</span>
            <span className="text-red-600 dark:text-red-400">- 删除 {jsonResult.stats.removed}</span>
            <span className="text-amber-600 dark:text-amber-400">~ 变更 {jsonResult.stats.changed}</span>
            <span className="text-slate-500">= 未变 {jsonResult.stats.unchanged}</span>
          </>
        )}
        <Button className="ml-auto" variant="danger" onClick={() => { setLeft(''); setRight('') }}>
          清空
        </Button>
      </div>
      <TwoPane
        left={
          <Panel title={mode === 'json' ? '原 JSON' : '原文本'}>
            <TextArea value={left} onChange={(e) => setLeft(e.target.value)} onFileText={(t) => setLeft(t)} placeholder={mode === 'json' ? '粘贴原始 JSON' : '粘贴原始文本'} />
          </Panel>
        }
        right={
          <Panel title={mode === 'json' ? '对比 JSON' : '对比文本'}>
            <TextArea value={right} onChange={(e) => setRight(e.target.value)} onFileText={(t) => setRight(t)} placeholder={mode === 'json' ? '粘贴对比 JSON' : '粘贴对比文本'} />
          </Panel>
        }
      />
      <ErrorHint
        message={
          mode === 'line'
            ? lineResult.error
            : mode === 'char'
              ? charResult.error
              : jsonResult?.error
        }
      />
      <Panel title="差异结果" className="max-h-[40vh]">
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 font-mono text-xs dark:border-slate-700 dark:bg-slate-900/50">
          {mode === 'line' && (
            lineResult.diff.length === 0 || (!left && !right) ? (
              <div className="p-3 text-slate-400">暂无内容</div>
            ) : (
              lineResult.diff.map((line, i) => (
                <div
                  key={i}
                  className={`flex whitespace-pre-wrap px-2 py-0.5 ${
                    line.op === 'insert'
                      ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                      : line.op === 'delete'
                        ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                        : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="mr-3 select-none text-slate-400">
                    {line.op === 'insert' ? '+' : line.op === 'delete' ? '-' : ' '}
                  </span>
                  <span className="flex-1">{line.text || ' '}</span>
                </div>
              ))
            )
          )}
          {mode === 'char' && (
            !left && !right ? (
              <div className="p-3 text-slate-400">暂无内容</div>
            ) : (
              <div className="whitespace-pre-wrap p-3 leading-relaxed">
                {charResult.diff.map((seg, i) =>
                  seg.op === 'equal' ? (
                    <span key={i} className="text-slate-600 dark:text-slate-300">{seg.text}</span>
                  ) : seg.op === 'insert' ? (
                    <ins key={i} className="rounded bg-green-500/20 text-green-700 no-underline dark:text-green-300">{seg.text}</ins>
                  ) : (
                    <del key={i} className="rounded bg-red-500/20 text-red-700 dark:text-red-300">{seg.text}</del>
                  ),
                )}
              </div>
            )
          )}
          {mode === 'json' && (
            !jsonResult || jsonResult.error ? (
              <div className="p-3 text-slate-400">{jsonResult?.error ? '' : '暂无内容'}</div>
            ) : (
              jsonResult.entries.filter((e) => e.type !== 'unchanged').length === 0 ? (
                <div className="p-3 text-slate-400">两侧结构一致</div>
              ) : (
                jsonResult.entries
                  .filter((e) => e.type !== 'unchanged')
                  .map((e, i) => (
                    <div
                      key={i}
                      className={`px-2 py-0.5 ${
                        e.type === 'added'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                          : e.type === 'removed'
                            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <span className="select-none">
                        {e.type === 'added' ? '+ ' : e.type === 'removed' ? '- ' : '~ '}
                      </span>
                      <span className="text-sky-600 dark:text-sky-400">{e.path}</span>
                      {e.type === 'changed' && (
                        <span>: {JSON.stringify(e.left)} → {JSON.stringify(e.right)}</span>
                      )}
                      {e.type === 'added' && <span>: {JSON.stringify(e.right)}</span>}
                      {e.type === 'removed' && <span>: {JSON.stringify(e.left)}</span>}
                    </div>
                  ))
              )
            )
          )}
        </div>
      </Panel>
    </ToolShell>
  )
}

// ---------------- 正则测试 ----------------
export function RegexTool() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [input, setInput] = useState('')

  const result = useMemo(() => testRegex(pattern, flags, input), [pattern, flags, input])

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f))
  }

  const highlighted = useMemo(() => {
    if (!pattern || !result.valid || result.matches.length === 0) return null
    const parts: Array<{ text: string; match: boolean }> = []
    let last = 0
    for (const m of result.matches) {
      if (m.index > last) parts.push({ text: input.slice(last, m.index), match: false })
      parts.push({ text: input.slice(m.index, m.index + m.match.length), match: true })
      last = m.index + m.match.length
    }
    if (last < input.length) parts.push({ text: input.slice(last), match: false })
    return parts
  }, [input, pattern, result])

  return (
    <ToolShell title="正则表达式测试" description="实时匹配高亮，展示分组捕获与常用速查">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-slate-400">/</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="正则表达式"
          className="min-w-[200px] flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="font-mono text-slate-400">/</span>
        <div className="flex gap-1">
          {['g', 'i', 'm', 's', 'u', 'y'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFlag(f)}
              className={`h-8 w-8 rounded-md font-mono text-sm ${
                flags.includes(f)
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {regexPresets.map((p) => (
          <button
            key={p.name}
            type="button"
            title={p.description}
            onClick={() => setPattern(p.pattern)}
            className="rounded-md bg-slate-200/70 px-2 py-1 text-xs text-slate-600 hover:bg-slate-300/70 dark:bg-slate-700/60 dark:text-slate-300"
          >
            {p.name}
          </button>
        ))}
      </div>
      <ErrorHint message={result.valid ? undefined : result.error} />
      <TwoPane
        left={
          <Panel title="测试文本" actions={<div className="flex items-center gap-2"><span className="text-xs text-slate-400">{result.matches.length} 处匹配</span><HistoryMenu toolId="regex" value={input} onRestore={setInput} /></div>}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入待匹配文本" />
          </Panel>
        }
        right={
          <Panel title="匹配预览">
            <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900/50">
              {highlighted
                ? highlighted.map((p, i) =>
                    p.match ? (
                      <mark key={i} className="rounded bg-yellow-300/70 text-slate-900 dark:bg-yellow-500/40 dark:text-yellow-100">
                        {p.text}
                      </mark>
                    ) : (
                      <span key={i}>{p.text}</span>
                    ),
                  )
                : <span className="text-slate-400">无匹配</span>}
            </div>
          </Panel>
        }
      />
      {result.matches.length > 0 && (
        <Panel title="分组捕获" className="max-h-[30vh]">
          <div className="min-h-0 flex-1 overflow-auto text-sm">
            {result.matches.map((m, i) => (
              <div key={i} className="border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-700/50">
                <span className="font-mono text-sky-600 dark:text-sky-400">#{i + 1}</span>{' '}
                <span className="font-mono">{m.match}</span>
                <span className="ml-2 text-xs text-slate-400">@ {m.index}</span>
                {m.groups.length > 0 && (
                  <div className="ml-6 mt-0.5 text-xs text-slate-500">
                    {m.groups.map((g, gi) => (
                      <span key={gi} className="mr-3">
                        ${gi + 1}: <span className="font-mono text-slate-700 dark:text-slate-300">{g || '∅'}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ToolShell>
  )
}

// ---------------- 文本转换（大小写 / 命名 / 行处理 / 统计） ----------------
export function TextTransformTool() {
  const [input, setInput] = useState('')
  const [ops, setOps] = useState<LineOps>({ sort: 'none' })

  const stats = useMemo(() => textStats(input), [input])
  const naming = useMemo(() => (input.trim() ? convertNamingAll(input.trim().split(/\s+/)[0] || input) : null), [input])
  const lineResult = useMemo(() => processLines(input, ops), [input, ops])

  const setOp = <K extends keyof LineOps>(k: K, v: LineOps[K]) => setOps((p) => ({ ...p, [k]: v }))

  return (
    <ToolShell title="文本转换" description="大小写、命名风格、行去重/排序、字符统计">
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => setInput(toUpperCase)}>全大写</Button>
        <Button onClick={() => setInput(toLowerCase)}>全小写</Button>
        <Button onClick={() => setInput(toTitleCase)}>单词首字母大写</Button>
        <Button onClick={() => setInput(toSentenceCase)}>句首大写</Button>
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>清空</Button>
      </div>
      <TwoPane
        left={
          <Panel title="输入" actions={<div className="flex items-center gap-2"><HistoryMenu toolId="text-transform" value={input} onRestore={setInput} /><CopyButton text={input} /></div>}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder="输入文本" />
          </Panel>
        }
        right={
          <Panel
            title="行处理结果"
            actions={<CopyButton text={lineResult} />}
          >
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <Checkbox checked={!!ops.trim} onChange={(v) => setOp('trim', v)} label="去首尾空格" />
              <Checkbox checked={!!ops.dedupe} onChange={(v) => setOp('dedupe', v)} label="去重" />
              <Checkbox checked={!!ops.removeEmpty} onChange={(v) => setOp('removeEmpty', v)} label="去空行" />
              <Segmented
                value={ops.sort ?? 'none'}
                onChange={(v) => setOp('sort', v)}
                options={[
                  { label: '不排序', value: 'none' },
                  { label: '升序', value: 'asc' },
                  { label: '降序', value: 'desc' },
                ]}
              />
            </div>
            <Output value={lineResult} />
          </Panel>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="字符数" value={stats.chars} />
        <Stat label="不含空白" value={stats.charsNoSpaces} />
        <Stat label="单词数" value={stats.words} />
        <Stat label="行数" value={stats.lines} />
      </div>
      {naming && (
        <Panel title="命名风格转换（取首个单词/整体）">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(naming).map(([style, val]) => (
              <div key={style} className="flex items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-1.5 dark:bg-slate-900/50">
                <span className="text-xs text-slate-400">{style}</span>
                <span className="flex-1 truncate font-mono text-sm">{val}</span>
                <CopyButton text={val} label="复制" />
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ToolShell>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <div className="text-2xl font-semibold text-sky-600 dark:text-sky-400">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  )
}
