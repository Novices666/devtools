import { useState, useMemo } from 'react'

interface JsonTreeProps {
  data: unknown
  /** 搜索关键词：命中键或值时高亮 */
  filter?: string
}

/** 可折叠 JSON 树视图，支持节点 JSONPath 路径复制与关键词高亮 */
export function JsonTree({ data, filter = '' }: JsonTreeProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900/50">
      <TreeNode nodeKey={null} value={data} path="$" depth={0} filter={filter.trim().toLowerCase()} defaultOpen />
    </div>
  )
}

interface TreeNodeProps {
  nodeKey: string | number | null
  value: unknown
  path: string
  depth: number
  filter: string
  defaultOpen?: boolean
}

function TreeNode({ nodeKey, value, path, depth, filter, defaultOpen = false }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2 || defaultOpen)
  const [copied, setCopied] = useState(false)

  const isArray = Array.isArray(value)
  const isObject = value !== null && typeof value === 'object' && !isArray
  const isBranch = isArray || isObject

  const entries: Array<[string | number, unknown]> = useMemo(() => {
    if (isArray) return (value as unknown[]).map((v, i) => [i, v])
    if (isObject) return Object.entries(value as Record<string, unknown>)
    return []
  }, [value, isArray, isObject])

  const keyMatches = filter !== '' && nodeKey !== null && String(nodeKey).toLowerCase().includes(filter)
  const valueMatches =
    filter !== '' && !isBranch && String(value).toLowerCase().includes(filter)

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(path)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const keyLabel =
    nodeKey === null ? null : (
      <span
        className={`cursor-pointer ${keyMatches ? 'rounded bg-yellow-300/60 dark:bg-yellow-500/30' : ''} text-sky-700 dark:text-sky-300`}
        onClick={copyPath}
        title={`点击复制路径：${path}`}
      >
        {typeof nodeKey === 'number' ? nodeKey : `"${nodeKey}"`}
      </span>
    )

  if (!isBranch) {
    return (
      <div className="group flex items-start gap-1 py-0.5" style={{ paddingLeft: depth * 14 }}>
        <span className="w-3 shrink-0" aria-hidden />
        {keyLabel}
        {keyLabel && <span className="text-slate-400">:</span>}
        <span className={`${valueMatches ? 'rounded bg-yellow-300/60 dark:bg-yellow-500/30' : ''} ${valueColor(value)}`}>
          {renderScalar(value)}
        </span>
        {copied && <span className="text-green-500">✓已复制路径</span>}
      </div>
    )
  }

  const bracket = isArray ? ['[', ']'] : ['{', '}']
  return (
    <div>
      <div className="group flex items-center gap-1 py-0.5" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-3 shrink-0 select-none text-slate-400 hover:text-slate-600"
          aria-label={open ? '折叠' : '展开'}
        >
          {open ? '▾' : '▸'}
        </button>
        {keyLabel}
        {keyLabel && <span className="text-slate-400">:</span>}
        <span className="text-slate-400">{bracket[0]}</span>
        {!open && <span className="text-slate-400">…{bracket[1]}</span>}
        <span className="text-[10px] text-slate-400">
          {isArray ? `${entries.length} 项` : `${entries.length} 键`}
        </span>
        <button
          type="button"
          onClick={copyPath}
          className="ml-1 rounded px-1 text-[10px] text-slate-400 opacity-0 transition-opacity hover:text-sky-500 group-hover:opacity-100"
          title={`复制路径：${path}`}
        >
          {copied ? '✓' : '⧉ 路径'}
        </button>
      </div>
      {open && (
        <div>
          {entries.map(([k, v]) => (
            <TreeNode
              key={k}
              nodeKey={k}
              value={v}
              path={isArray ? `${path}[${k}]` : `${path}.${k}`}
              depth={depth + 1}
              filter={filter}
            />
          ))}
          <div className="text-slate-400" style={{ paddingLeft: depth * 14 }}>
            {bracket[1]}
          </div>
        </div>
      )}
    </div>
  )
}

function renderScalar(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

function valueColor(value: unknown): string {
  if (value === null) return 'text-slate-400'
  switch (typeof value) {
    case 'string':
      return 'text-green-600 dark:text-green-400'
    case 'number':
      return 'text-amber-600 dark:text-amber-400'
    case 'boolean':
      return 'text-purple-600 dark:text-purple-400'
    default:
      return 'text-slate-600 dark:text-slate-300'
  }
}
