import { describe, expect, it } from 'vitest'
import { decodeTextFileBytes, inferImageMime } from './files'

describe('text file decoding', () => {
  it('decodes UTF-8 with or without BOM', () => {
    const utf8 = new TextEncoder().encode('你好, text')
    expect(decodeTextFileBytes(utf8)).toBe('你好, text')
    expect(decodeTextFileBytes(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8]))).toBe('你好, text')
  })

  it('decodes UTF-16 LE and BE with BOM', () => {
    expect(decodeTextFileBytes(Uint8Array.from([0xff, 0xfe, 0x60, 0x4f, 0x7d, 0x59]))).toBe('你好')
    expect(decodeTextFileBytes(Uint8Array.from([0xfe, 0xff, 0x4f, 0x60, 0x59, 0x7d]))).toBe('你好')
  })

  it('rejects bytes that are not valid supported text', () => {
    expect(() => decodeTextFileBytes(Uint8Array.from([0x81]))).toThrow('文件编码无法识别')
    expect(() => decodeTextFileBytes(Uint8Array.from([0xff, 0xfe, 0x61]))).toThrow('文件编码无法识别')
  })
})

describe('image file MIME inference', () => {
  it('uses a declared image MIME or falls back to a known extension', () => {
    expect(inferImageMime({ name: 'photo.bin', type: 'image/png' })).toBe('image/png')
    expect(inferImageMime({ name: 'photo.JPEG', type: '' })).toBe('image/jpeg')
    expect(inferImageMime({ name: 'icon.svg', type: 'application/octet-stream' })).toBe('image/svg+xml')
  })

  it('rejects files without an image MIME or known image extension', () => {
    expect(inferImageMime({ name: 'notes.txt', type: 'text/plain' })).toBeNull()
  })
})
