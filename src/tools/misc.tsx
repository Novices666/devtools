import { useMemo, useRef, useState } from 'react'
import {
  ToolShell,
  TwoPane,
  Panel,
  TextArea,
  Output,
  CopyButton,
  Button,
  TextInput,
  Select,
  Segmented,
  Checkbox,
  ErrorHint,
} from '../components/ui'
import { marked } from 'marked'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import { sanitizeHtml } from '../core/sanitize'
import { highlightCode, normalizeLang } from '../core/highlight'
import {
  generateMockData,
  mockToCsv,
  mockFieldLabels,
  type MockField,
  type MockFieldType,
} from '../core/mock'
import { calcSubnet, parseUserAgent } from '../core/network'
import { HistoryMenu } from '../components/HistoryMenu'

// ---------------- Markdown 预览 ----------------
const MD_SAMPLE = `# 标题

- 列表项 1
- 列表项 2
- [x] 已完成任务
- [ ] 待办任务

\`\`\`js
console.log('hello')
\`\`\`

| 列 A | 列 B |
|------|------|
| 1    | 2    |

> 引用文本

**加粗** 与 *斜体*
`

export function MarkdownTool() {
  const [input, setInput] = useState('')
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    // 自定义代码块渲染：本地语法高亮，输出带 hl-* class 的 span
    const renderer = new marked.Renderer()
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const language = normalizeLang(lang)
      const highlighted = highlightCode(text, language)
      const langLabel = lang ? ` data-lang="${normalizeLang(lang)}"` : ''
      return `<pre class="hl-pre"${langLabel}><code class="hl-code">${highlighted}</code></pre>`
    }
    return sanitizeHtml(marked.parse(input || '', { renderer }) as string)
  }, [input])

  return (
    <ToolShell title="Markdown 预览" description="实时渲染 Markdown，支持表格、任务列表、代码块">
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => setInput(MD_SAMPLE)}>示例</Button>
        <Button variant="danger" onClick={() => setInput('')}>清空</Button>
      </div>
      <TwoPane
        left={
          <Panel title="Markdown" actions={<HistoryMenu toolId="markdown" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder="输入 Markdown，或拖入 .md 文件" />
          </Panel>
        }
        right={
          <Panel title="预览">
            <div
              className="markdown-preview min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------------- 图片压缩 / 格式转换 ----------------
type ImgFormat = 'image/png' | 'image/jpeg' | 'image/webp'
const FORMAT_EXT: Record<ImgFormat, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

interface ImgResult {
  url: string
  size: number
  width: number
  height: number
}

export function ImageTool() {
  const [srcName, setSrcName] = useState('')
  const [srcInfo, setSrcInfo] = useState<ImgResult | null>(null)
  const [result, setResult] = useState<ImgResult | null>(null)
  const [format, setFormat] = useState<ImgFormat>('image/webp')
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState('')
  const [keepRatio, setKeepRatio] = useState(true)
  const [error, setError] = useState<string>()
  const imgRef = useRef<HTMLImageElement | null>(null)

  const process = (img: HTMLImageElement) => {
    try {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth
      let h = img.naturalHeight
      const mw = Number(maxWidth)
      if (mw > 0 && w > mw) {
        if (keepRatio) h = Math.round((h * mw) / w)
        w = mw
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff' // JPEG 无透明通道，铺白底
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)
      const q = format === 'image/png' ? undefined : quality / 100
      const url = canvas.toDataURL(format, q)
      const size = Math.round((url.length - url.indexOf(',') - 1) * 0.75)
      setResult({ url, size, width: w, height: h })
      setError(undefined)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const onFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    setSrcName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        setSrcInfo({ url: img.src, size: file.size, width: img.naturalWidth, height: img.naturalHeight })
        process(img)
      }
      img.onerror = () => setError('图片解码失败')
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // 参数变化时重新处理
  const reprocess = () => {
    if (imgRef.current) process(imgRef.current)
  }

  const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`)
  const ratio = srcInfo && result ? Math.round((1 - result.size / srcInfo.size) * 100) : 0

  return (
    <ToolShell title="图片工具" description="本地压缩与格式转换（PNG / JPG / WebP），可调质量与尺寸">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          目标格式
          <Select
            value={format}
            onChange={(v) => { setFormat(v as ImgFormat); setTimeout(reprocess, 0) }}
            options={[
              { label: 'WebP', value: 'image/webp' },
              { label: 'JPG', value: 'image/jpeg' },
              { label: 'PNG', value: 'image/png' },
            ]}
          />
        </label>
        {format !== 'image/png' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            质量 {quality}
            <input
              type="range"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              onMouseUp={reprocess}
              onTouchEnd={reprocess}
              className="w-32"
            />
          </label>
        )}
        <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          最大宽度
          <TextInput value={maxWidth} onChange={(v) => setMaxWidth(v.replace(/\D/g, ''))} placeholder="原始" className="w-20" />
        </label>
        <Checkbox checked={keepRatio} onChange={setKeepRatio} label="保持比例" />
        <Button onClick={reprocess} disabled={!srcInfo}>应用</Button>
      </div>
      <ErrorHint message={error} />
      {!srcInfo && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 p-12 text-sm text-slate-500 hover:border-sky-400 dark:border-slate-600">
          <span className="text-3xl text-slate-400"><FontAwesomeIcon icon={faImage} /></span>
          <span>点击或拖拽选择图片</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />
        </label>
      )}
      {srcInfo && (
        <TwoPane
          left={
            <Panel
              title="原图"
              actions={
                <label className="cursor-pointer text-xs text-sky-600 hover:underline dark:text-sky-400">
                  更换
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
                </label>
              }
            >
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-slate-100 p-2 dark:bg-slate-900/50">
                <img src={srcInfo.url} alt="原图" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {srcName} · {srcInfo.width}×{srcInfo.height} · {fmtSize(srcInfo.size)}
              </div>
            </Panel>
          }
          right={
            <Panel
              title="结果"
              actions={
                result && (
                  <a href={result.url} download={`converted.${FORMAT_EXT[format]}`}>
                    <Button variant="primary">下载</Button>
                  </a>
                )
              }
            >
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-slate-100 p-2 dark:bg-slate-900/50">
                {result && <img src={result.url} alt="结果" className="max-h-full max-w-full object-contain" />}
              </div>
              {result && (
                <div className="mt-2 text-xs text-slate-500">
                  {result.width}×{result.height} · {fmtSize(result.size)}{' '}
                  {ratio > 0 ? (
                    <span className="text-green-600 dark:text-green-400">↓ 压缩 {ratio}%</span>
                  ) : ratio < 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">↑ 增大 {-ratio}%</span>
                  ) : null}
                </div>
              )}
            </Panel>
          }
        />
      )}
    </ToolShell>
  )
}

// ---------------- Mock 数据生成 ----------------
const FIELD_TYPES = Object.keys(mockFieldLabels) as MockFieldType[]

export function MockTool() {
  const [fields, setFields] = useState<MockField[]>([
    { key: 'name', type: 'name' },
    { key: 'phone', type: 'phone' },
    { key: 'email', type: 'email' },
  ])
  const [count, setCount] = useState(10)
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [output, setOutput] = useState('')

  const generate = () => {
    const rows = generateMockData(fields, count)
    setOutput(format === 'json' ? JSON.stringify(rows, null, 2) : mockToCsv(rows))
  }

  const updateField = (i: number, patch: Partial<MockField>) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  return (
    <ToolShell title="Mock 数据生成" description="生成假数据：姓名、手机号、邮箱、地址、身份证等，输出 JSON / CSV">
      <TwoPane
        left={
          <Panel title="字段配置" actions={<Button onClick={() => setFields((p) => [...p, { key: `field${p.length + 1}`, type: 'name' }])}>+ 字段</Button>}>
            <div className="flex flex-col gap-2 overflow-auto">
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput value={f.key} onChange={(v) => updateField(i, { key: v })} placeholder="字段名" className="w-32" />
                  <Select
                    value={f.type}
                    onChange={(v) => updateField(i, { type: v })}
                    options={FIELD_TYPES.map((t) => ({ label: mockFieldLabels[t], value: t }))}
                    className="flex-1"
                  />
                  <Button variant="danger" onClick={() => setFields((p) => p.filter((_, idx) => idx !== i))}>删</Button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-500">数量</label>
              <TextInput value={String(count)} onChange={(v) => setCount(Math.max(1, Math.min(10000, Number(v) || 1)))} type="number" className="w-24" />
              <Segmented value={format} onChange={setFormat} options={[{ label: 'JSON', value: 'json' }, { label: 'CSV', value: 'csv' }]} />
              <Button variant="primary" onClick={generate}>生成</Button>
            </div>
          </Panel>
        }
        right={
          <Panel title="输出" actions={<CopyButton text={output} />}>
            <Output value={output} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------------- IP / 子网计算 ----------------
export function SubnetTool() {
  const [input, setInput] = useState('192.168.1.10/24')
  const info = useMemo(() => calcSubnet(input), [input])

  const rows: Array<[string, string | number]> = info.valid
    ? [
        ['网络地址', info.network],
        ['广播地址', info.broadcast],
        ['子网掩码', info.netmask],
        ['通配符掩码', info.wildcard],
        ['前缀长度', `/${info.prefix}`],
        ['首个可用主机', info.firstHost],
        ['末个可用主机', info.lastHost],
        ['地址总数', info.hostCount],
        ['可用主机数', info.usableHostCount],
        ['地址类别', info.ipClass],
        ['私有地址', info.isPrivate ? '是' : '否'],
      ]
    : []

  return (
    <ToolShell title="IP / 子网计算" description="输入 CIDR（如 192.168.1.10/24），计算网络/广播地址、掩码、可用主机数">
      <TextInput value={input} onChange={setInput} placeholder="192.168.1.10/24" className="font-mono" />
      <ErrorHint message={!info.valid ? info.error : undefined} />
      {info.valid && (
        <Panel>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-700/50">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="flex items-center gap-1.5 font-mono text-sm text-slate-800 dark:text-slate-100">
                  {value}
                  <CopyButton text={String(value)} label="⧉" className="px-1.5" />
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ToolShell>
  )
}

// ---------------- User-Agent 解析 ----------------
export function UserAgentTool() {
  const [input, setInput] = useState('')
  const useCurrent = () => setInput(navigator.userAgent)
  const info = useMemo(() => parseUserAgent(input), [input])

  const rows: Array<[string, string]> = [
    ['浏览器', info.browserVersion ? `${info.browser} ${info.browserVersion}` : info.browser],
    ['渲染引擎', info.engine],
    ['操作系统', info.osVersion ? `${info.os} ${info.osVersion}` : info.os],
    ['设备类型', info.device],
  ]

  return (
    <ToolShell title="User-Agent 解析" description="解析 UA 字符串，提取浏览器、引擎、操作系统、设备信息">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button onClick={useCurrent}>使用当前浏览器 UA</Button>
        <Button variant="danger" onClick={() => setInput('')}>清空</Button>
        <span className="ml-auto"><HistoryMenu toolId="user-agent" value={input} onRestore={setInput} /></span>
      </div>
      <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 User-Agent 字符串" className="max-h-28" />
      {input.trim() && (
        <Panel>
          <div className="flex flex-col gap-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-700/50">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm text-slate-800 dark:text-slate-100">{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ToolShell>
  )
}
