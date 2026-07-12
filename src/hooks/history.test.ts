import { describe, it, expect } from 'vitest'
import { SENSITIVE_TOOLS } from './useToolHistory'

describe('history sensitive-tool policy', () => {
  it('excludes credential/secret tools from history', () => {
    // 敏感工具不应记录历史，避免密钥/密码/令牌落盘
    for (const id of ['aes', 'rsa', 'bcrypt', 'password', 'hmac', 'jwt', 'hash']) {
      expect(SENSITIVE_TOOLS.has(id)).toBe(true)
    }
  })
  it('allows non-sensitive tools', () => {
    for (const id of ['json', 'yaml', 'xml', 'toml', 'regex', 'diff']) {
      expect(SENSITIVE_TOOLS.has(id)).toBe(false)
    }
  })
})
