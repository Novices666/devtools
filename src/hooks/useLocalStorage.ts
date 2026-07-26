import { useCallback, useEffect, useState } from 'react'

/** 本地持久化状态 hook；通过 storage 事件跨标签页同步 */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 忽略写入失败（如隐私模式）
    }
  }, [key, value])

  // 其他标签页写入同一 key 时同步到本页 React 状态
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      if (event.newValue === null) {
        setValue(initial)
        return
      }
      try {
        setValue(JSON.parse(event.newValue) as T)
      } catch {
        /* 忽略损坏数据 */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, initial])

  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue(v)
  }, [])

  return [value, set]
}
