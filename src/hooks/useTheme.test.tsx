import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './useTheme'

const matchMedia = vi.fn()

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  matchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  window.matchMedia = matchMedia
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('theme', () => {
  it('keeps native controls in sync with an explicit theme', async () => {
    const { result } = renderHook(() => useTheme())
    expect(document.documentElement.style.colorScheme).toBe('light')

    act(() => result.current.setTheme('dark'))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('uses the system color scheme in system mode', () => {
    matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    renderHook(() => useTheme())

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
