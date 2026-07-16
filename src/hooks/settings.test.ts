import { describe, it, expect, beforeEach } from 'vitest'
import { getSettings, setSettings, type Settings } from './useSettings'

describe('settings store', () => {
  beforeEach(() => {
    // 复位到默认
    setSettings({ processMode: 'auto', historyEnabled: true })
  })

  it('has sensible defaults', () => {
    const s = getSettings()
    expect(s.processMode).toBe('auto')
    expect(s.historyEnabled).toBe(true)
  })

  it('merges partial updates', () => {
    setSettings({ processMode: 'manual' })
    expect(getSettings().processMode).toBe('manual')
    // 其余字段保持不变
    expect(getSettings().historyEnabled).toBe(true)
    setSettings({ historyEnabled: false })
    expect(getSettings().processMode).toBe('manual')
    expect(getSettings().historyEnabled).toBe(false)
  })

  it('persists to localStorage', () => {
    setSettings({ processMode: 'manual' })
    const raw = localStorage.getItem('devtoolbox:settings')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).processMode).toBe('manual')
  })

  it('only persists supported settings', () => {
    setSettings({ historyEnabled: false, clipboardDetect: true } as Partial<Settings> & { clipboardDetect: boolean })
    expect(JSON.parse(localStorage.getItem('devtoolbox:settings')!)).toEqual({
      processMode: 'auto',
      historyEnabled: false,
    })
  })
})
