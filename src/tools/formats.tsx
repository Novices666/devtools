import { useMemo, useState } from 'react'
import { ToolShell, TwoPane, Panel, TextArea, Output, CopyButton, Button, Segmented, ErrorHint, Checkbox, Select, TextInput, ProcessControls, ProcessingHint } from '../components/ui'
import { useProcessMode } from '../hooks/useProcessMode'
import { useAsyncProcess } from '../hooks/useAsyncProcess'
import {
  jsonToYaml,
  yamlToJson,
  formatYaml,
  csvToJson,
  jsonToCsv,
  csvToMarkdown,
  markdownToCsv,
  parseCsv,
  jsonToXml,
  xmlToJson,
  formatXml,
  minifyXml,
  formatSql,
  minifySql,
  jsonToTypes,
  type TargetLang,
  type SqlDialect,
} from '../core/formats'
import { tomlToJson, jsonToToml } from '../core/toml'
import { HistoryMenu } from '../components/HistoryMenu'

// ---------- YAML ↔ JSON ----------
export function YamlTool() {
  const [input, setInput] = useState('')
  const [dir, setDir] = useState<'y2j' | 'j2y' | 'fmt'>('y2j')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => (!text.trim() ? '' : dir === 'y2j' ? yamlToJson(text) : dir === 'j2y' ? jsonToYaml(text) : formatYaml(text)),
    [dir],
  )
  const out = result ?? ''
  return (
    <ToolShell title="YAML 工具" description="YAML ↔ JSON 互转、格式化">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={dir}
          onChange={setDir}
          options={[
            { label: 'YAML → JSON', value: 'y2j' },
            { label: 'JSON → YAML', value: 'j2y' },
            { label: 'YAML 格式化', value: 'fmt' },
          ]}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title="输入" actions={<HistoryMenu toolId="yaml" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder={dir === 'j2y' ? '粘贴 JSON' : '粘贴 YAML'} />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- CSV ----------
type CsvMode = 'c2j' | 'j2c' | 'c2md' | 'md2c'
export function CsvTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<CsvMode>('c2j')
  const [delimiter, setDelimiter] = useState(',')
  const [header, setHeader] = useState(true)
  const [preview, setPreview] = useState(false)
  const d = delimiter === '\\t' ? '\t' : delimiter || ','
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => {
      if (!text.trim()) return ''
      if (mode === 'c2j') return csvToJson(text, { delimiter: d, header })
      if (mode === 'j2c') return jsonToCsv(text, d)
      if (mode === 'md2c') return markdownToCsv(text, d)
      return csvToMarkdown(text, { delimiter: d, header })
    },
    [mode, d, header],
  )
  const out = result ?? ''

  // 表格预览：把当前输入（CSV）或输出（转出的 CSV）解析为网格
  const previewRows = useMemo(() => {
    if (!preview) return null
    const csvText = mode === 'j2c' ? out : mode === 'md2c' ? out : committed
    if (!csvText.trim()) return null
    try {
      return parseCsv(csvText, d)
    } catch {
      return null
    }
  }, [preview, mode, committed, out, d])

  return (
    <ToolShell title="CSV 工具" description="CSV ↔ JSON、CSV ↔ Markdown 表格、表格化预览">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: 'CSV → JSON', value: 'c2j' },
            { label: 'JSON → CSV', value: 'j2c' },
            { label: 'CSV → Markdown', value: 'c2md' },
            { label: 'Markdown → CSV', value: 'md2c' },
          ]}
        />
        <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          分隔符
          <TextInput value={delimiter} onChange={setDelimiter} className="w-16" placeholder="," />
        </label>
        {(mode === 'c2j' || mode === 'c2md') && <Checkbox checked={header} onChange={setHeader} label="首行为表头" />}
        <Checkbox checked={preview} onChange={setPreview} label="表格预览" />
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title="输入" actions={<HistoryMenu toolId="csv" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder={mode === 'j2c' ? '粘贴 JSON 数组' : mode === 'md2c' ? '粘贴 Markdown 表格' : '粘贴 CSV'} />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
      {previewRows && previewRows.length > 0 && (
        <Panel title="表格预览" className="max-h-[40vh]">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className={ri === 0 && header && mode !== 'j2c' ? 'bg-slate-100 font-medium dark:bg-slate-700/50' : ''}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-slate-200 px-2 py-1 dark:border-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </ToolShell>
  )
}

// ---------- XML ----------
type XmlMode = 'j2x' | 'x2j' | 'fmt' | 'min'
export function XmlTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<XmlMode>('j2x')
  const [root, setRoot] = useState('root')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => {
      if (!text.trim()) return ''
      if (mode === 'j2x') return jsonToXml(text, root || 'root')
      if (mode === 'x2j') return xmlToJson(text)
      if (mode === 'fmt') return formatXml(text)
      return minifyXml(text)
    },
    [mode, root],
  )
  const out = result ?? ''
  const jsonInput = mode === 'j2x'
  return (
    <ToolShell title="XML 工具" description="JSON ↔ XML 互转、XML 格式化 / 压缩 / 校验">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: 'JSON → XML', value: 'j2x' },
            { label: 'XML → JSON', value: 'x2j' },
            { label: 'XML 格式化', value: 'fmt' },
            { label: 'XML 压缩', value: 'min' },
          ]}
        />
        {jsonInput && (
          <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
            根节点名
            <TextInput value={root} onChange={setRoot} className="w-32" placeholder="root" />
          </label>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title={jsonInput ? 'JSON 输入' : 'XML 输入'} actions={<HistoryMenu toolId="xml" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder={jsonInput ? '粘贴 JSON' : '粘贴 XML'} />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- TOML ----------
const TOML_SAMPLE = `title = "示例"

[owner]
name = "Tom"
age = 30

[[servers]]
host = "10.0.0.1"
port = 8080

[[servers]]
host = "10.0.0.2"
port = 8081`

export function TomlTool() {
  const [input, setInput] = useState('')
  const [dir, setDir] = useState<'t2j' | 'j2t'>('t2j')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => (!text.trim() ? '' : dir === 't2j' ? tomlToJson(text) : jsonToToml(text)),
    [dir],
  )
  const out = result ?? ''
  return (
    <ToolShell title="TOML 工具" description="TOML ↔ JSON 互转（支持表、数组表、行内表）">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={dir}
          onChange={setDir}
          options={[
            { label: 'TOML → JSON', value: 't2j' },
            { label: 'JSON → TOML', value: 'j2t' },
          ]}
        />
        <Button onClick={() => { setDir('t2j'); setInput(TOML_SAMPLE) }}>示例</Button>
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title={dir === 't2j' ? 'TOML 输入' : 'JSON 输入'} actions={<HistoryMenu toolId="toml" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder={dir === 't2j' ? '粘贴 TOML' : '粘贴 JSON'} />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- SQL ----------
export function SqlTool() {
  const [input, setInput] = useState('')
  const [uppercase, setUppercase] = useState(true)
  const [mode, setMode] = useState<'format' | 'minify'>('format')
  const [dialect, setDialect] = useState<SqlDialect>('standard')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => (!text.trim() ? '' : mode === 'format' ? formatSql(text, uppercase, dialect) : minifySql(text)),
    [uppercase, mode, dialect],
  )
  const out = result ?? ''
  return (
    <ToolShell title="SQL 格式化" description="SQL 美化（关键字大写、子句换行）与压缩，支持 MySQL / PostgreSQL / SQLite 方言">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '格式化', value: 'format' },
            { label: '压缩', value: 'minify' },
          ]}
        />
        {mode === 'format' && (
          <>
            <Select
              value={dialect}
              onChange={setDialect}
              options={[
                { label: '通用 SQL', value: 'standard' },
                { label: 'MySQL', value: 'mysql' },
                { label: 'PostgreSQL', value: 'postgresql' },
                { label: 'SQLite', value: 'sqlite' },
              ]}
            />
            <Checkbox checked={uppercase} onChange={setUppercase} label="关键字大写" />
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title="输入" actions={<HistoryMenu toolId="sql" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder="粘贴 SQL 语句" />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- JSON → 类型定义 ----------
export function JsonTypesTool() {
  const [input, setInput] = useState('')
  const [lang, setLang] = useState<TargetLang>('typescript')
  const [rootName, setRootName] = useState('Root')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { result, error, pending, large } = useAsyncProcess(
    committed,
    (text) => (!text.trim() ? '' : jsonToTypes(text, lang, rootName || 'Root')),
    [lang, rootName],
  )
  const out = result ?? ''
  return (
    <ToolShell title="JSON → 类型定义" description="根据 JSON 生成 TypeScript / Go / Java / Kotlin 类型">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={lang}
          onChange={setLang}
          options={[
            { label: 'TypeScript', value: 'typescript' },
            { label: 'Go', value: 'go' },
            { label: 'Java', value: 'java' },
            { label: 'Kotlin', value: 'kotlin' },
          ]}
        />
        <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          根类型名
          <TextInput value={rootName} onChange={setRootName} className="w-32" placeholder="Root" />
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
          <Button variant="danger" onClick={() => setInput('')}>
            清空
          </Button>
        </div>
      </div>
      <TwoPane
        left={
          <Panel title="JSON 输入" actions={<HistoryMenu toolId="json-types" value={input} onRestore={setInput} />}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder="粘贴 JSON" />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel title="类型定义输出" actions={<div className="flex items-center gap-1.5"><ProcessingHint pending={pending} large={large} /><CopyButton text={out} /></div>}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}
