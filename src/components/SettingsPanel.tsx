import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useSettings } from '../hooks/useSettings'
import { useTheme, type Theme } from '../hooks/useTheme'
import { Segmented } from './ui'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

/** 集中设置面板：主题、处理模式、历史开关、剪贴板识别开关。以抽屉形式弹出。 */
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [settings, update] = useSettings()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="设置">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-80 max-w-full flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
          <span className="text-base font-semibold">设置</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <Row label="主题" hint="明亮 / 暗黑 / 跟随系统">
            <Segmented<Theme>
              value={theme}
              onChange={setTheme}
              options={[
                { label: '明亮', value: 'light' },
                { label: '暗黑', value: 'dark' },
                { label: '系统', value: 'system' },
              ]}
            />
          </Row>

          <Row label="处理模式" hint="自动：输入即处理；手动：点击执行">
            <Segmented
              value={settings.processMode}
              onChange={(v) => update({ processMode: v })}
              options={[
                { label: '自动', value: 'auto' },
                { label: '手动', value: 'manual' },
              ]}
            />
          </Row>

          <Row label="历史记录" hint="记录工具输入快照（敏感工具始终不记录）">
            <Toggle
              checked={settings.historyEnabled}
              onChange={(v) => update({ historyEnabled: v })}
              label="启用历史记录"
            />
          </Row>

          <Row label="剪贴板识别" hint="顶部横幅根据剪贴板内容推荐工具">
            <Toggle
              checked={settings.clipboardDetect}
              onChange={(v) => update({ clipboardDetect: v })}
              label="启用剪贴板识别"
            />
          </Row>

          <div className="rounded-lg bg-slate-100 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900/50">
            所有设置与数据仅保存在本机（localStorage），不会上传服务器。离线优先，数据不出本机。
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900/50"
    >
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
