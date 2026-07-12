import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAsyncProcess } from './useAsyncProcess'

describe('useAsyncProcess', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('小输入走同步快路径：立即出结果、pending 恒为 false', () => {
    const { result } = renderHook(() =>
      useAsyncProcess('abc', (s) => s.toUpperCase()),
    )
    expect(result.current.result).toBe('ABC')
    expect(result.current.pending).toBe(false)
    expect(result.current.large).toBe(false)
  })

  it('同步路径捕获抛错并填入 error', () => {
    const { result } = renderHook(() =>
      useAsyncProcess('x', () => {
        throw new Error('boom')
      }),
    )
    expect(result.current.result).toBeUndefined()
    expect(result.current.error).toBe('boom')
  })

  it('大输入走异步路径：先 pending，防抖后出结果', () => {
    const big = 'a'.repeat(50) // 阈值调低以便测试
    const { result } = renderHook(() =>
      useAsyncProcess(big, (s) => s.length, [], { asyncThreshold: 10, debounceMs: 200 }),
    )
    // 初次渲染即进入异步路径，标记处理中
    expect(result.current.large).toBe(true)
    expect(result.current.pending).toBe(true)
    expect(result.current.result).toBeUndefined()
    // 防抖时间到，计算完成
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.pending).toBe(false)
    expect(result.current.result).toBe(50)
  })

  it('大输入处理期间保留上一次结果，不闪空', () => {
    let input = 'a'.repeat(20)
    const { result, rerender } = renderHook(
      ({ v }) => useAsyncProcess(v, (s) => s.length, [], { asyncThreshold: 10, debounceMs: 200 }),
      { initialProps: { v: input } },
    )
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.result).toBe(20)

    // 输入变化，重新处理期间旧结果仍在
    input = 'a'.repeat(30)
    rerender({ v: input })
    expect(result.current.pending).toBe(true)
    expect(result.current.result).toBe(20) // 不清空
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.result).toBe(30)
  })

  it('快速连续变更只计算最后一次（防抖 + 序号守卫）', () => {
    const process = vi.fn((s: string) => s.length)
    const { rerender } = renderHook(
      ({ v }) => useAsyncProcess(v, process, [], { asyncThreshold: 5, debounceMs: 200 }),
      { initialProps: { v: 'aaaaaa' } },
    )
    process.mockClear()
    rerender({ v: 'aaaaaaa' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ v: 'aaaaaaaa' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ v: 'aaaaaaaaa' })
    act(() => vi.advanceTimersByTime(200))
    // 只有最后一次防抖窗口内的输入被真正计算
    expect(process).toHaveBeenCalledTimes(1)
    expect(process).toHaveBeenLastCalledWith('aaaaaaaaa')
  })

  it('从大输入切回小输入时恢复同步结果，不被残留异步覆盖', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAsyncProcess(v, (s) => s.length, [], { asyncThreshold: 10, debounceMs: 200 }),
      { initialProps: { v: 'a'.repeat(20) } },
    )
    expect(result.current.large).toBe(true)
    // 切回小输入
    rerender({ v: 'abc' })
    expect(result.current.large).toBe(false)
    expect(result.current.pending).toBe(false)
    expect(result.current.result).toBe(3)
  })
})
