import { describe, it, expect } from 'vitest'
import { highlightCode, normalizeLang } from './highlight'
import { sanitizeHtml } from './sanitize'

describe('highlight', () => {
  it('normalizes language aliases', () => {
    expect(normalizeLang('js')).toBe('javascript')
    expect(normalizeLang('TS')).toBe('typescript')
    expect(normalizeLang('py')).toBe('python')
    expect(normalizeLang('golang')).toBe('go')
    expect(normalizeLang('mysql')).toBe('sql')
    expect(normalizeLang(undefined)).toBe('plaintext')
    expect(normalizeLang('weirdlang')).toBe('plaintext')
  })

  it('escapes html in plaintext', () => {
    expect(highlightCode('<script>&', 'plaintext')).toBe('&lt;script&gt;&amp;')
  })

  it('highlights js keywords, strings, numbers, comments', () => {
    const out = highlightCode('const x = 42 // hi', 'javascript')
    expect(out).toContain('<span class="hl-keyword">const</span>')
    expect(out).toContain('<span class="hl-number">42</span>')
    expect(out).toContain('<span class="hl-comment">// hi</span>')
  })

  it('highlights string literals without breaking html', () => {
    const out = highlightCode('let s = "a<b>c"', 'javascript')
    expect(out).toContain('hl-string')
    // 内部的 < > 必须转义
    expect(out).toContain('&lt;b&gt;')
    expect(out).not.toContain('<b>')
  })

  it('highlights function calls', () => {
    const out = highlightCode('foo(1)', 'javascript')
    expect(out).toContain('<span class="hl-function">foo</span>')
  })

  it('highlights json properties and literals', () => {
    const out = highlightCode('{"a": true, "b": 3}', 'json')
    expect(out).toContain('hl-property')
    expect(out).toContain('<span class="hl-keyword">true</span>')
    expect(out).toContain('<span class="hl-number">3</span>')
  })

  it('highlights sql keywords case-insensitively', () => {
    const out = highlightCode('select * from t', 'sql')
    expect(out).toContain('<span class="hl-keyword">select</span>')
    expect(out).toContain('<span class="hl-keyword">from</span>')
  })

  it('output survives sanitizeHtml (class attrs preserved)', () => {
    const out = highlightCode('const x = 1', 'javascript')
    const wrapped = `<pre class="hl-pre"><code class="hl-code">${out}</code></pre>`
    const clean = sanitizeHtml(wrapped)
    expect(clean).toContain('hl-keyword')
    expect(clean).toContain('class="hl-pre"')
  })

  it('does not hang on unmatched input', () => {
    // 含大量特殊字符不应死循环
    const src = '@#$%^&*(){}[]'.repeat(50)
    const out = highlightCode(src, 'javascript')
    expect(out.length).toBeGreaterThan(0)
  })
})
