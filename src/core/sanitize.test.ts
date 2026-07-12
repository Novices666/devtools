import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('removes script tags and content', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })
  it('removes inline event handlers', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror')
    expect(sanitizeHtml('<div onclick=doEvil()>hi</div>')).not.toContain('onclick')
  })
  it('neutralizes javascript: urls', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('javascript:')
  })
  it('removes iframe and object', () => {
    expect(sanitizeHtml('<iframe src="evil"></iframe><p>keep</p>')).toBe('<p>keep</p>')
    expect(sanitizeHtml('<object data="x"></object>ok')).toBe('ok')
  })
  it('preserves safe content and image data uris', () => {
    const safe = '<p>Hello <strong>world</strong></p><a href="https://x.com">link</a>'
    expect(sanitizeHtml(safe)).toBe(safe)
    const img = '<img src="data:image/png;base64,AAAA">'
    expect(sanitizeHtml(img)).toContain('data:image/png')
  })
  it('blocks data:text/html', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toContain('data:text/html')
  })
})
