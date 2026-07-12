import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from './useSettings'

export interface HistoryEntry {
  value: string
  at: number
}

const STORAGE_PREFIX = 'devtoolbox:history:'
const MAX_ENTRIES = 20
const MAX_VALUE_LEN = 20000 // 超长输入不入历史，避免撑爆 localStorage

/** 敏感工具：不记录历史，避免密钥/密码/令牌泄露 */
export const SENSITIVE_TOOLS = new Set(['aes', 'rsa', 'bcrypt', 'password', 'hmac', 'jwt', 'hash'])

function load(toolId: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + toolId)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

/**
 * 工具输入历史记录：自动去抖记录快照，持久化到 localStorage。
 * 敏感工具（见 SENSITIVE_TOOLS）不记录。
 */
export function useToolHistory(toolId: string, value: string) {
  const [settings] = useSettings()
  // 敏感工具永不记录；其余受全局历史开关控制
  const enabled = !SENSITIVE_TOOLS.has(toolId) && settings.historyEnabled
  const [entries, setEntries] = useState<HistoryEntry[]>(() =>
    !SENSITIVE_TOOLS.has(toolId) ? load(toolId) : [],
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 去抖记录（停止输入 800ms 后写入一条）
  useEffect(() => {
    if (!enabled) return
    const v = value.trim()
    if (v === '' || v.length > MAX_VALUE_LEN) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setEntries((prev) => {
        if (prev[0]?.value === v) return prev // 与最近一条相同则跳过
        const next = [{ value: v, at: Date.now() }, ...prev.filter((e) => e.value !== v)].slice(0, MAX_ENTRIES)
        try {
          localStorage.setItem(STORAGE_PREFIX + toolId, JSON.stringify(next))
        } catch {
          /* 忽略写入失败 */
        }
        return next
      })
    }, 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, toolId, enabled])

  const clear = useCallback(() => {
    setEntries([])
    try {
      localStorage.removeItem(STORAGE_PREFIX + toolId)
    } catch {
      /* ignore */
    }
  }, [toolId])

  const remove = useCallback(
    (at: number) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.at !== at)
        try {
          localStorage.setItem(STORAGE_PREFIX + toolId, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [toolId],
  )

  return { enabled, entries, clear, remove }
}
