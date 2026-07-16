import { useCallback, useEffect, useRef } from 'react'

/** 为异步操作生成有效性检查，确保只有最近一次操作可以写回界面状态。 */
export function useLatestOperation(): {
  begin: () => () => boolean
  cancel: () => void
} {
  const sequenceRef = useRef(0)

  const begin = useCallback(() => {
    const sequence = ++sequenceRef.current
    return () => sequence === sequenceRef.current
  }, [])

  const cancel = useCallback(() => {
    sequenceRef.current++
  }, [])

  useEffect(() => () => cancel(), [cancel])

  return { begin, cancel }
}
