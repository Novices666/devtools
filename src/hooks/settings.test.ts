import { describe, it, expect, beforeEach } from 'vitest'
import { getSettings, setSettings } from './useSettings'

describe('settings store', () => {
  beforeEach(() => {
    // 复位到默认
    setSettings({ processMode: 'auto', historyEnabled: true, clipboardDetect: true })
  })

  it('has sensible defaults', () => {
    const s = getSettings()
    expect(s.processMode).toBe('auto')
    expect(s.historyEnabled).toBe(true)
    expect(s.clipboardDetect).toBe(true)
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
    setSettings({ clipboardDetect: false })
    const raw = localStorage.getItem('devtoolbox:settings')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).clipboardDetect).toBe(false)
  })
})
