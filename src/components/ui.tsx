import {
  useState,
  useCallback,
  type ReactNode,
  type TextareaHTMLAttributes,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'

// ---------- 复制按钮 ----------
export function CopyButton({ text, label = '复制', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 回退方案
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!text}
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        copied
          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
          : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/70 disabled:opacity-40 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-600/60'
      } ${className}`}
    >
      {copied ? '✓ 已复制' : label}
    </button>
  )
}

// ---------- 通用按钮 ----------
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}
export function Button({ variant = 'ghost', className = '', children, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600',
    ghost: 'bg-slate-200/70 text-slate-700 hover:bg-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-600/60',
    danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

// ---------- 面板 ----------
export function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</span>
          <div className="flex items-center gap-1.5">{actions}</div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </div>
  )
}

// ---------- 文本输入区（支持拖拽文件） ----------
interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onFileText?: (text: string, file: File) => void
  mono?: boolean
}
export function TextArea({ onFileText, mono = true, className = '', ...rest }: TextAreaProps) {
  const [dragging, setDragging] = useState(false)
  const onDrop = useCallback(
    (e: DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && onFileText) {
        const reader = new FileReader()
        reader.onload = () => onFileText(String(reader.result ?? ''), file)
        reader.readAsText(file)
      }
    },
    [onFileText],
  )
  return (
    <textarea
      spellCheck={false}
      onDragOver={(e) => {
        if (onFileText) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onFileText ? onDrop : undefined}
      className={`min-h-0 flex-1 resize-none rounded-md border bg-slate-50 p-3 text-sm outline-none transition-colors focus:border-sky-400 dark:bg-slate-900/50 dark:text-slate-100 ${
        mono ? 'font-mono' : ''
      } ${dragging ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-200 dark:border-slate-700'} ${className}`}
      {...rest}
    />
  )
}

// ---------- 只读输出区 ----------
export function Output({ value, mono = true, className = '' }: { value: string; mono?: boolean; className?: string }) {
  return (
    <textarea
      readOnly
      spellCheck={false}
      value={value}
      className={`min-h-0 flex-1 resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 ${
        mono ? 'font-mono' : ''
      } ${className}`}
    />
  )
}

// ---------- 错误提示 ----------
export function ErrorHint({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </div>
  )
}

// ---------- 标签选择 ----------
export function Segmented<T extends string | number>({ options, value, onChange }: { options: Array<{ label: string; value: T }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md bg-slate-200/70 p-0.5 dark:bg-slate-700/60">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------- 下拉选择 ----------
export function Select<T extends string>({ options, value, onChange, className = '' }: { options: Array<{ label: string; value: T }>; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
      className={`rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ---------- 复选框 ----------
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400 dark:border-slate-600"
      />
      {label}
    </label>
  )
}

// ---------- 单行输入 ----------
export function TextInput({ value, onChange, placeholder, className = '', type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    />
  )
}

// ---------- 工具页脚手架 ----------
export function ToolShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ---------- 手动处理控制条（仅手动模式显示） ----------
export function ProcessControls({ manual, dirty, onRun }: { manual: boolean; dirty: boolean; onRun: () => void }) {
  if (!manual) return null
  return (
    <button
      type="button"
      onClick={onRun}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        dirty
          ? 'bg-sky-500 text-white hover:bg-sky-600'
          : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300'
      }`}
      title="手动模式：处理当前输入"
    >
      <FontAwesomeIcon icon={faPlay} className="text-[0.7em]" /> 执行{dirty ? ' •' : ''}
    </button>
  )
}

// ---------- 大文本处理进度提示 ----------
export function ProcessingHint({ pending, large }: { pending: boolean; large: boolean }) {
  if (!large) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs transition-opacity ${
        pending ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${pending ? 'animate-pulse bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      />
      {pending ? '大文本处理中…' : '大文本（已异步处理）'}
    </span>
  )
}

// ---------- 双栏布局 ----------
export function TwoPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
      {left}
      {right}
    </div>
  )
}
