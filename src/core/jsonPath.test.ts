import { describe, expect, it } from 'vitest'
import { appendJsonPath } from './jsonPath'

describe('appendJsonPath', () => {
  it('uses dot notation for identifier keys', () => {
    expect(appendJsonPath('$', 'user_name')).toBe('$.user_name')
    expect(appendJsonPath('$.user', '$id')).toBe('$.user.$id')
  })

  it('uses escaped bracket notation for special keys', () => {
    expect(appendJsonPath('$', 'a.b')).toBe('$["a.b"]')
    expect(appendJsonPath('$', 'display name')).toBe('$["display name"]')
    expect(appendJsonPath('$', 'a"b')).toBe('$["a\\"b"]')
    expect(appendJsonPath('$', '')).toBe('$[""]')
  })
})
