import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLatestOperation } from './useLatestOperation'

describe('useLatestOperation', () => {
  it('only keeps the latest operation valid', () => {
    const { result } = renderHook(() => useLatestOperation())
    let firstIsCurrent = () => false
    let secondIsCurrent = () => false

    act(() => {
      firstIsCurrent = result.current.begin()
      secondIsCurrent = result.current.begin()
    })

    expect(firstIsCurrent()).toBe(false)
    expect(secondIsCurrent()).toBe(true)
  })

  it('invalidates the current operation when cancelled', () => {
    const { result } = renderHook(() => useLatestOperation())
    let isCurrent = () => false
    act(() => {
      isCurrent = result.current.begin()
      result.current.cancel()
    })
    expect(isCurrent()).toBe(false)
  })

  it('invalidates the current operation when unmounted', () => {
    const { result, unmount } = renderHook(() => useLatestOperation())
    const isCurrent = result.current.begin()
    unmount()
    expect(isCurrent()).toBe(false)
  })
})
