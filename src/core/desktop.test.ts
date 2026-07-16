import { describe, it, expect } from 'vitest'
import { isDesktop, platform, resolveOpenFileTool } from './desktop'

// jsdom 环境无 Tauri 运行时，应全部安全降级为 no-op
describe('desktop bridge (web fallback)', () => {
  it('detects non-desktop environment', () => {
    expect(isDesktop()).toBe(false)
    expect(platform()).toBe('web')
  })
})

describe('open file target resolution', () => {
  it('prefers known file extensions', () => {
    expect(resolveOpenFileTool('C:\\work\\config.yaml', 'title: demo')).toBe('yaml')
    expect(resolveOpenFileTool('/tmp/query.sql', 'not valid sql yet')).toBe('sql')
    expect(resolveOpenFileTool('README.md', '# Title')).toBe('markdown')
  })

  it('detects supported content and falls back to text transform', () => {
    expect(resolveOpenFileTool('data.txt', '{"ok":true}')).toBe('json')
    expect(resolveOpenFileTool('token.txt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123')).toBe('jwt')
    expect(resolveOpenFileTool('notes.txt', 'ordinary notes')).toBe('text-transform')
  })
})
