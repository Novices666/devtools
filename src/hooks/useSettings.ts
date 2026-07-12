import { useCallback, useSyncExternalStore } from 'react'

/**
 * 全局设置：处理模式（自动/手动）、历史记录开关、剪贴板识别开关等。
 * 采用轻量的模块级 store + useSyncExternalStore，使非组件模块（如 useToolHistory）
 * 也能读取当前设置，无需 Context 层层传递。持久化到 localStorage。
 */

export type ProcessMode = 'auto' | 'manual'

export interface Settings {
  /** 处理模式：auto=输入即处理；manual=需点击"执行"或 Ctrl+Enter */
  processMode: ProcessMode
  /** 是否记录工具输入历史 */
  historyEnabled: boolean
  /** 是否启用剪贴板智能识别横幅 */
  clipboardDetect: boolean
}

const STORAGE_KEY = 'devtoolbox:settings'

const DEFAULT_SETTINGS: Settings = {
  processMode: 'auto',
  historyEnabled: true,
  clipboardDetect: true,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
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

/** 更新设置（部分字段合并） */
export function setSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
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
