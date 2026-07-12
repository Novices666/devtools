import { useCallback, useEffect, useState } from 'react'

/** 本地持久化状态 hook，跨标签页同步 */
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

  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue(v)
  }, [])

  return [value, set]
}
