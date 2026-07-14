import { describe, it, expect } from 'vitest'
import { isDesktop, platform, onOpenFile, onClipboardChanged } from './desktop'

// jsdom 环境无 Tauri 运行时，应全部安全降级为 no-op
describe('desktop bridge (web fallback)', () => {
  it('detects non-desktop environment', () => {
    expect(isDesktop()).toBe(false)
    expect(platform()).toBe('web')
  })
  it('subscriptions return no-op unsubscribe without throwing', () => {
    const off1 = onOpenFile(() => {})
    const off3 = onClipboardChanged(() => {})
    expect(typeof off1).toBe('function')
    expect(typeof off3).toBe('function')
    // 调用取消订阅不应抛错
    expect(() => {
      off1()
      off3()
    }).not.toThrow()
  })
})
