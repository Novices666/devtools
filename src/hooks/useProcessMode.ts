import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from './useSettings'

/**
 * 处理模式辅助 hook。
 *
 * 自动模式（默认）：committed 始终跟随 live，输入即处理。
 * 手动模式：committed 仅在调用 commit()（或 Ctrl/Cmd+Enter）时更新，
 *          期间 dirty=true 表示存在未处理的改动。
 *
 * 工具将 committed 传入既有的 useMemo 计算即可，改动量极小。
 */
export function useProcessMode(live: string): {
  committed: string
  commit: () => void
  manual: boolean
  dirty: boolean
} {
  const [settings] = useSettings()
  const manual = settings.processMode === 'manual'
  const [manualCommitted, setManualCommitted] = useState(live)
  const liveRef = useRef(live)
  liveRef.current = live

  // 自动模式下直接跟随 live（渲染期计算，避免额外 effect 与测试 act 警告）；
  // 手动模式下使用最近一次 commit 的快照。
  const committed = manual ? manualCommitted : live

  const commit = useCallback(() => setManualCommitted(liveRef.current), [])

  // 切换到手动模式的瞬间，用当前 live 作为快照，避免显示挂载时的旧值
  const prevManual = useRef(manual)
  useEffect(() => {
    if (manual && !prevManual.current) setManualCommitted(liveRef.current)
    prevManual.current = manual
  }, [manual])

  // 手动模式下 Ctrl/Cmd+Enter 触发处理
  useEffect(() => {
    if (!manual) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        commit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [manual, commit])

  const dirty = manual && committed !== live

  return { committed, commit, manual, dirty }
}
