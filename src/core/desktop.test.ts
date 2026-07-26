import { describe, it, expect } from 'vitest'
import { isDesktop, platform, resolveOpenFileTool, resolveImageOpenTool, isImageFile } from './desktop'

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

  it('does not route digests or uuids to hash/id tools', () => {
    expect(resolveOpenFileTool('x.txt', 'd41d8cd98f00b204e9800998ecf8427e')).toBe('text-transform')
    expect(resolveOpenFileTool('x.txt', '550e8400-e29b-41d4-a716-446655440000')).toBe(
      'text-transform',
    )
  })
})

describe('image open routing', () => {
  it('detects image files by mime or extension', () => {
    expect(isImageFile({ name: 'a.png', type: 'image/png' })).toBe(true)
    expect(isImageFile({ name: 'a.PNG', type: '' })).toBe(true)
    expect(isImageFile({ name: 'a.txt', type: 'text/plain' })).toBe(false)
  })

  it('keeps image-capable tools, otherwise routes to image tool', () => {
    expect(resolveImageOpenTool('qrcode')).toBe('qrcode')
    expect(resolveImageOpenTool('hash')).toBe('hash')
    expect(resolveImageOpenTool('base64')).toBe('base64')
    expect(resolveImageOpenTool('image')).toBe('image')
    expect(resolveImageOpenTool('json')).toBe('image')
  })
})

