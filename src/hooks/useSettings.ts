import { useCallback, useSyncExternalStore } from 'react'

/**
 * 全局设置：处理模式（自动/手动）、历史记录开关。
 * 采用轻量的模块级 store + useSyncExternalStore，使非组件模块（如 useToolHistory）
 * 也能读取当前设置，无需 Context 层层传递。持久化到 localStorage。
 */

export type ProcessMode = 'auto' | 'manual'

export interface Settings {
  /** 处理模式：auto=输入即处理；manual=支持的工具需点击「执行」 */
  processMode: ProcessMode
  /** 是否记录工具输入历史 */
  historyEnabled: boolean
}

const STORAGE_KEY = 'devtoolbox:settings'

const DEFAULT_SETTINGS: Settings = {
  processMode: 'auto',
  historyEnabled: true,
}

function normalize(value: Partial<Settings>): Settings {
  return {
    processMode: value.processMode === 'manual' ? 'manual' : 'auto',
    historyEnabled: typeof value.historyEnabled === 'boolean' ? value.historyEnabled : true,
  }
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const settings = normalize(JSON.parse(raw) as Partial<Settings>)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current: Settings = load()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    /* 忽略写入失败 */
  }
}

/** 直接读取当前设置（供非组件模块使用） */
export function getSettings(): Settings {
  return current
}

const HISTORY_STORAGE_PREFIX = 'devtoolbox:history:'

/** 关闭历史时清除所有工具历史落盘数据 */
function clearAllToolHistories() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(HISTORY_STORAGE_PREFIX)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* 忽略清理失败 */
  }
}

/** 更新设置（部分字段合并） */
export function setSettings(patch: Partial<Settings>): void {
  const previous = current
  current = normalize({ ...current, ...patch })
  if (previous.historyEnabled && !current.historyEnabled) {
    clearAllToolHistories()
  }
  persist()
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** React hook：订阅设置，返回 [settings, update] */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, getSettings, getSettings)
  const update = useCallback((patch: Partial<Settings>) => setSettings(patch), [])
  return [settings, update]
}
