import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useToolHistory } from '../hooks/useToolHistory'

interface HistoryMenuProps {
  toolId: string
  /** 当前输入值（用于记录快照） */
  value: string
  /** 选择历史条目时回填 */
  onRestore: (value: string) => void
}

function relTime(at: number): string {
  const diff = Date.now() - at
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

/** 历史记录下拉：记录输入快照，可回溯与删除。敏感工具自动隐藏。 */
export function HistoryMenu({ toolId, value, onRestore }: HistoryMenuProps) {
  const { enabled, entries, clear, remove } = useToolHistory(toolId, value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!enabled) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="历史记录"
        className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300/70 disabled:opacity-40 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-600/60"
        disabled={entries.length === 0}
      >
        <FontAwesomeIcon icon={faClockRotateLeft} /> 历史{entries.length > 0 ? `(${entries.length})` : ''}
      </button>
      {open && entries.length > 0 && (
        <div className="absolute right-0 z-20 mt-1 max-h-80 w-80 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-slate-400">最近 {entries.length} 条</span>
            <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">
              清空
            </button>
          </div>
          {entries.map((e) => (
            <div
              key={e.at}
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            >
              <button
                type="button"
                onClick={() => {
                  onRestore(e.value)
                  setOpen(false)
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                  {e.value.slice(0, 80)}
                </div>
                <div className="text-[10px] text-slate-400">{relTime(e.at)}</div>
              </button>
              <button
                type="button"
                onClick={() => remove(e.at)}
                className="shrink-0 text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                title="删除此条"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
