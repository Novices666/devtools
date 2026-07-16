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
  it('blocks dangerous protocols without quoted attributes', () => {
    const out = sanitizeHtml('<a href=javascript:alert(1)>x</a><img src=JaVaScRiPt:alert(2)>')
    expect(out.toLowerCase()).not.toContain('javascript:')
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
  it('preserves Markdown tables, task inputs, and code highlighting classes', () => {
    const markdown = '<table><tbody><tr><td>x</td></tr></tbody></table><input checked disabled type="checkbox"><pre class="hl-pre" data-lang="js"><code><span class="hl-keyword">const</span></code></pre>'
    const out = sanitizeHtml(markdown)
    expect(out).toContain('<table>')
    expect(out).toContain('type="checkbox"')
    expect(out).toContain('class="hl-keyword"')
    expect(out).toContain('data-lang="js"')
  })
  it('blocks data:text/html', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toContain('data:text/html')
  })
})
