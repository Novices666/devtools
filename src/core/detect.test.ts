import { describe, it, expect } from 'vitest'
import { detectContent } from './detect'

describe('detectContent', () => {
  const top = (s: string) => detectContent(s)[0]?.toolId

  it('detects JSON', () => {
    expect(top('{"a":1}')).toBe('json')
    expect(top('[1,2,3]')).toBe('json')
  })
  it('detects JWT', () => {
    expect(top('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123')).toBe('jwt')
  })
  it('detects URL', () => {
    expect(top('https://example.com/p?a=1')).toBe('url')
  })
  it('detects timestamp', () => {
    expect(detectContent('1600000000').some((r) => r.toolId === 'timestamp')).toBe(true)
  })
  it('detects color', () => {
    expect(top('#ff0000')).toBe('color')
    expect(top('rgb(1,2,3)')).toBe('color')
  })
  it('detects uuid', () => {
    expect(top('550e8400-e29b-41d4-a716-446655440000')).toBe('id')
  })
  it('detects cidr', () => {
    expect(top('192.168.1.0/24')).toBe('subnet')
  })
  it('detects user agent', () => {
    expect(top('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120')).toBe('user-agent')
  })
  it('detects xml', () => {
    expect(detectContent('<root><a>1</a></root>').some((r) => r.toolId === 'xml')).toBe(true)
  })
  it('detects sql', () => {
    expect(top('SELECT * FROM users')).toBe('sql')
  })
  it('empty input yields nothing', () => {
    expect(detectContent('  ')).toEqual([])
  })
})
