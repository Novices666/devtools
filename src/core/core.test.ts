import { describe, it, expect } from 'vitest'
import {
  formatJson,
  minifyJson,
  validateJson,
  sortJsonKeys,
  queryJsonPath,
  escapeJsonString,
  unescapeJsonString,
} from './json'
import {
  textToBase64,
  base64ToText,
  base64ToBytes,
  textToBase,
  baseToText,
  encodeBase,
  decodeBase,
  type BaseEncoding,
  detectImageMime,
  base64ToImage,
  urlEncode,
  urlDecode,
  parseQueryString,
  parseQueryStringStrict,
  buildQueryString,
  queryParamsToJson,
  jsonToQueryParams,
  escapeHtml,
  unescapeHtml,
  toUnicodeEscape,
  fromUnicodeEscape,
  escapeString,
  unescapeString,
} from './encoding'
import { parseJwt, jwtStatus, verifyJwtHmac, verifyJwtAsymmetric, jwtAlgFamily } from './jwt'
import { hashText, hashAll, hmac } from './hash'
import { aesEncrypt, aesDecrypt, generatePassword, generateToken } from './crypto'
import { parseTimestamp, describeTimestamp, relativeTime } from './time'
import { parseCron, nextExecutions } from './cron'
import { uuidV4, uuidV1, generateUlid, generateNanoId, parseSnowflake } from './id'
import {
  textStats,
  convertNaming,
  convertNamingAll,
  processLines,
  testRegex,
  diffLines,
  diffStats,
  diffChars,
  MAX_DIFF_MATRIX_CELLS,
  diffJson,
  jsonDiffStats,
  toTitleCase,
} from './text'
import { convertRadix, parseColor, rgbToHsl, hslToRgb, rgbToHsv, rgbToHex, hexToRgb } from './convert'
import {
  jsonToYaml,
  yamlToJson,
  parseCsv,
  csvToJson,
  jsonToCsv,
  csvToMarkdown,
  markdownToCsv,
  parseMarkdownTable,
  jsonToXml,
  xmlToJson,
  formatXml,
  minifyXml,
  validateXml,
  formatSql,
  minifySql,
  jsonToTypes,
} from './formats'
import { calcSubnet, parseUserAgent } from './network'
import { parseToml, tomlToJson, jsonToToml } from './toml'
import { generateRsaKeyPair, rsaEncrypt, rsaDecrypt } from './rsa'
import { generateMockData, mockIdCard, mockToCsv } from './mock'

// ---------------- JSON ----------------
describe('json', () => {
  it('formats with configurable indent', () => {
    expect(formatJson('{"a":1}', 2)).toBe('{\n  "a": 1\n}')
    expect(formatJson('{"a":1}', 'tab')).toBe('{\n\t"a": 1\n}')
  })
  it('minifies', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
  })
  it('validates and locates errors', () => {
    expect(validateJson('{"a":1}').valid).toBe(true)
    const bad = validateJson('{"a":}')
    expect(bad.valid).toBe(false)
    expect(bad.error).toBeTruthy()
  })
  it('sorts keys recursively', () => {
    expect(sortJsonKeys('{"b":1,"a":{"d":2,"c":3}}', true)).toBe(
      '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}',
    )
  })
  it('queries with JSONPath', () => {
    const doc = '{"store":{"books":[{"t":"a"},{"t":"b"}]}}'
    expect(queryJsonPath(doc, '$.store.books[0].t')).toEqual(['a'])
    expect(queryJsonPath(doc, '$.store.books[*].t')).toEqual(['a', 'b'])
    expect(queryJsonPath(doc, '$..t')).toEqual(['a', 'b'])
  })
  it('queries JSONPath slices', () => {
    const doc = '{"a":[10,20,30,40,50]}'
    expect(queryJsonPath(doc, '$.a[1:3]')).toEqual([20, 30])
    expect(queryJsonPath(doc, '$.a[2:]')).toEqual([30, 40, 50])
    expect(queryJsonPath(doc, '$.a[:2]')).toEqual([10, 20])
    expect(queryJsonPath(doc, '$.a[::2]')).toEqual([10, 30, 50])
    expect(queryJsonPath(doc, '$.a[-2:]')).toEqual([40, 50])
  })
  it('queries JSONPath filter expressions', () => {
    const doc = '{"items":[{"n":"x","p":5},{"n":"y","p":15},{"n":"z","p":25}]}'
    expect(queryJsonPath(doc, '$.items[?(@.p>10)]')).toEqual([
      { n: 'y', p: 15 },
      { n: 'z', p: 25 },
    ])
    expect(queryJsonPath(doc, '$.items[?(@.p<=15)].n')).toEqual(['x', 'y'])
    expect(queryJsonPath(doc, "$.items[?(@.n=='z')].p")).toEqual([25])
    expect(queryJsonPath(doc, '$.items[?(@.p)]').length).toBe(3)
  })
  it('escapes and unescapes json strings', () => {
    expect(escapeJsonString('a"b\n')).toBe('"a\\"b\\n"')
    expect(unescapeJsonString('"a\\"b\\n"')).toBe('a"b\n')
  })
})

// ---------------- encoding ----------------
describe('encoding', () => {
  it('base64 roundtrip with UTF-8', () => {
    const s = '你好, world! 🚀'
    expect(base64ToText(textToBase64(s))).toBe(s)
  })
  it('url-safe base64', () => {
    const b = textToBase64('>>>???', true)
    expect(b).not.toContain('+')
    expect(b).not.toContain('/')
    expect(base64ToText(b)).toBe('>>>???')
  })
  it('supports common Base encodings with known vectors', () => {
    expect(textToBase('foo', 'base16')).toBe('666F6F')
    expect(textToBase('foo', 'base32')).toBe('MZXW6===')
    expect(textToBase('foo', 'base58')).toBe('bQbp')
    expect(textToBase('foo', 'base64')).toBe('Zm9v')
    expect(textToBase('foo', 'base64url')).toBe('Zm9v')
    expect(textToBase('foo', 'ascii85')).toBe('AoDS')
  })
  it('roundtrips every Base encoding and preserves leading zero bytes', () => {
    const bases: BaseEncoding[] = ['base16', 'base32', 'base36', 'base58', 'base62', 'base64', 'base64url', 'ascii85']
    const bytes = new Uint8Array([0, 0, 1, 2, 3, 250, 255])
    for (const base of bases) {
      expect(decodeBase(encodeBase(bytes, base), base)).toEqual(bytes)
    }
  })
  it('encodes whitespace-only text instead of treating it as empty', () => {
    expect(textToBase(' ', 'base16')).toBe('20')
    expect(baseToText('20', 'base16')).toBe(' ')
  })
  it('bounds quadratic radix conversions to short data', () => {
    expect(() => encodeBase(new Uint8Array(4097), 'base58')).toThrow('4096 字节')
    expect(() => decodeBase('z'.repeat(6000), 'base58')).toThrow('短数据')
    expect(() => encodeBase(new Uint8Array(4097), 'base64')).not.toThrow()
  })
  it('supports selectable character encodings', () => {
    expect(textToBase('你好', 'base16', 'utf-8')).toBe('E4BDA0E5A5BD')
    expect(textToBase('你好', 'base16', 'utf-16le')).toBe('604F7D59')
    expect(textToBase('你好', 'base16', 'utf-16be')).toBe('4F60597D')
    expect(textToBase('你好', 'base16', 'utf-32le')).toBe('604F00007D590000')
    expect(textToBase('你好', 'base16', 'utf-32be')).toBe('00004F600000597D')
    expect(baseToText('604F00007D590000', 'base16', 'utf-32le')).toBe('你好')
    expect(baseToText('00004F600000597D', 'base16', 'utf-32be')).toBe('你好')
    expect(baseToText(textToBase('café', 'ascii85', 'iso-8859-1'), 'ascii85', 'iso-8859-1')).toBe('café')
    expect(baseToText(textToBase('plain text', 'base62', 'ascii'), 'base62', 'ascii')).toBe('plain text')
    expect(() => textToBase('中文', 'base64', 'ascii')).toThrow('无法表示')
    expect(() => textToBase('中文', 'base64', 'iso-8859-1')).toThrow('无法表示')
  })
  it('rejects malformed Base input', () => {
    expect(() => decodeBase('ABC', 'base16')).toThrow('偶数')
    expect(() => decodeBase('MZXW6=!=', 'base32')).toThrow('非法')
    expect(() => decodeBase('A', 'base32')).toThrow('长度')
    expect(() => decodeBase('MZXW6==', 'base32')).toThrow('填充')
    expect(() => decodeBase('0OIl', 'base58')).toThrow('非法')
    expect(() => decodeBase('A', 'base64')).toThrow('长度')
    expect(() => decodeBase('Zm9v=', 'base64')).toThrow('填充')
    expect(() => decodeBase('~', 'ascii85')).toThrow('非法')
  })
  it('url encode/decode', () => {
    expect(urlEncode('a b&c')).toBe('a%20b%26c')
    expect(urlDecode('a%20b%26c')).toBe('a b&c')
  })
  it('parse and build query string', () => {
    const params = parseQueryString('https://x.com/p?a=1&b=hello%20world#frag')
    expect(params).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'hello world' },
    ])
    expect(buildQueryString(params)).toBe('a=1&b=hello%20world')
  })
  it('strictly parses URLs and query strings', () => {
    expect(parseQueryStringStrict('https://x.com/path?a=1&tag=one&tag=two#section')).toEqual([
      { key: 'a', value: '1' },
      { key: 'tag', value: 'one' },
      { key: 'tag', value: 'two' },
    ])
    expect(parseQueryStringStrict('?flag&name=hello+world')).toEqual([
      { key: 'flag', value: '' },
      { key: 'name', value: 'hello world' },
    ])
    expect(parseQueryStringStrict('a=1&b=2')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
    expect(
      parseQueryStringStrict(
        'https://cn.bing.com/search?&q=github%E6%8F%90%E4%BA%A4%E8%A7%84%E8%8C%83',
      ),
    ).toEqual([{ key: 'q', value: 'github提交规范' }])
    expect(parseQueryStringStrict('?&a=1&&b=2&')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
  })
  it('rejects text and malformed query strings in strict mode', () => {
    expect(() => parseQueryStringStrict('ordinary text')).toThrow('key=value')
    expect(() => parseQueryStringStrict('https://example.com/path')).toThrow('未包含查询参数')
    expect(() => parseQueryStringStrict('/path?a=1')).toThrow('完整 URL')
    expect(() => parseQueryStringStrict('=value')).toThrow('空参数键')
    expect(() => parseQueryStringStrict('a=%ZZ')).toThrow('无效的 URL 编码')
    expect(() => parseQueryStringStrict('?&&')).toThrow('未包含有效参数')
  })
  it('converts query params to JSON and preserves duplicate keys', () => {
    const params = [
      { key: 'tag', value: 'one' },
      { key: 'name', value: 'devtoolbox' },
      { key: 'tag', value: 'two' },
      { key: '', value: 'ignored' },
    ]
    expect(JSON.parse(queryParamsToJson(params))).toEqual({
      tag: ['one', 'two'],
      name: 'devtoolbox',
    })
  })
  it('converts a JSON object to query params', () => {
    const params = jsonToQueryParams('{"tag":["one","two"],"page":2,"active":true,"empty":null}')
    expect(params).toEqual([
      { key: 'tag', value: 'one' },
      { key: 'tag', value: 'two' },
      { key: 'page', value: '2' },
      { key: 'active', value: 'true' },
      { key: 'empty', value: '' },
    ])
    expect(buildQueryString(params)).toBe('tag=one&tag=two&page=2&active=true&empty=')
  })
  it('rejects ambiguous JSON parameter structures', () => {
    expect(() => jsonToQueryParams('[]')).toThrow('顶层必须是对象')
    expect(() => jsonToQueryParams('{"filter":{"name":"x"}}')).toThrow('嵌套对象')
    expect(() => jsonToQueryParams('{bad json}')).toThrow('JSON 解析失败')
  })
  it('html entities', () => {
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;')
    expect(unescapeHtml('&lt;a&gt;&amp;&#39;')).toBe("<a>&'")
  })
  it('unicode escape roundtrip', () => {
    expect(toUnicodeEscape('中A')).toBe('\\u4e2dA')
    expect(fromUnicodeEscape('\\u4e2dA')).toBe('中A')
  })
  it('string escape roundtrip', () => {
    expect(escapeString('a\nb\t')).toBe('a\\nb\\t')
    expect(unescapeString('a\\nb\\t')).toBe('a\nb\t')
  })
  it('base64 to bytes', () => {
    const bytes = base64ToBytes(textToBase64('abc'))
    expect(Array.from(bytes)).toEqual([97, 98, 99])
  })
  it('detects image magic bytes', () => {
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('image/png')
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg')
    expect(detectImageMime(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('image/gif')
    expect(detectImageMime(new Uint8Array([1, 2, 3]))).toBeNull()
  })
  it('base64ToImage recognizes png and data uri', () => {
    // 1x1 png
    const pngB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const r = base64ToImage(pngB64)
    expect(r.isImage).toBe(true)
    expect(r.mime).toBe('image/png')
    expect(r.dataUri?.startsWith('data:image/png;base64,')).toBe(true)
    // 纯文本 base64 不是图片
    expect(base64ToImage(textToBase64('hello world')).isImage).toBe(false)
    // 已有 data URI
    expect(base64ToImage('data:image/gif;base64,R0lGODlh').isImage).toBe(true)
  })
})

// ---------------- jwt ----------------
describe('jwt', () => {
  // header {alg:HS256,typ:JWT}, payload {sub:123,exp:9999999999,iat:1516239022}
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTUxNjIzOTAyMn0.Kwd8Uc7Vfw0oXFwGX8lQfxL8P0hEr9Xd2fJ4wZfN0lE'
  it('parses segments', () => {
    const p = parseJwt(token)
    expect(p.header.alg).toBe('HS256')
    expect(p.payload.sub).toBe('123')
  })
  it('computes status', () => {
    const p = parseJwt(token)
    const st = jwtStatus(p.payload, 1600000000000)
    expect(st.expired).toBe(false)
    expect(st.issuedAt).toBeInstanceOf(Date)
  })
  it('verifies HS256 signature', () => {
    // build a token with known secret
    const secret = 'my-secret'
    const header = textToBase64('{"alg":"HS256","typ":"JWT"}', true)
    const payload = textToBase64('{"sub":"x"}', true)
    const signingInput = `${header}.${payload}`
    const sig = hmacB64Url(signingInput, secret)
    const t = `${signingInput}.${sig}`
    expect(verifyJwtHmac(t, secret)).toBe(true)
    expect(verifyJwtHmac(t, 'wrong')).toBe(false)
  })
  it('classifies alg families', () => {
    expect(jwtAlgFamily('HS256')).toBe('HMAC')
    expect(jwtAlgFamily('RS256')).toBe('RSA')
    expect(jwtAlgFamily('PS512')).toBe('RSA-PSS')
    expect(jwtAlgFamily('ES384')).toBe('EC')
    expect(jwtAlgFamily('none')).toBe('none')
    expect(jwtAlgFamily('XX')).toBe('unknown')
  })
  it('verifies ES256 signature via WebCrypto', async () => {
    if (!globalThis.crypto?.subtle) return // 环境不支持则跳过
    const enc = (obj: object) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const kp = await globalThis.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )
    const header = enc({ alg: 'ES256', typ: 'JWT' })
    const payload = enc({ sub: 'x' })
    const signingInput = `${header}.${payload}`
    const sigBuf = await globalThis.crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      kp.privateKey,
      new TextEncoder().encode(signingInput),
    )
    const sigBytes = new Uint8Array(sigBuf)
    let bin = ''
    for (const b of sigBytes) bin += String.fromCharCode(b)
    const sig = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const token = `${signingInput}.${sig}`
    // 导出公钥为 SPKI/PEM
    const spki = await globalThis.crypto.subtle.exportKey('spki', kp.publicKey)
    const spkiBytes = new Uint8Array(spki)
    let spkiBin = ''
    for (const b of spkiBytes) spkiBin += String.fromCharCode(b)
    const pem = `-----BEGIN PUBLIC KEY-----\n${btoa(spkiBin)}\n-----END PUBLIC KEY-----`
    expect(await verifyJwtAsymmetric(token, pem)).toBe(true)
    // 篡改 payload → 验签失败
    const bad = `${header}.${enc({ sub: 'y' })}.${sig}`
    expect(await verifyJwtAsymmetric(bad, pem)).toBe(false)
  })
})

// helper to make base64url HMAC-SHA256 for the test above
import CryptoJS from 'crypto-js'
function hmacB64Url(input: string, secret: string): string {
  return CryptoJS.HmacSHA256(input, secret)
    .toString(CryptoJS.enc.Base64)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ---------------- hash ----------------
describe('hash', () => {
  it('known digests', () => {
    expect(hashText('abc', 'MD5')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(hashText('abc', 'SHA1')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
    expect(hashText('abc', 'SHA256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
  it('hashAll returns all algos', () => {
    const all = hashAll('abc')
    expect(Object.keys(all)).toContain('SHA512')
  })
  it('hmac known value', () => {
    expect(hmac('The quick brown fox jumps over the lazy dog', 'key', 'SHA256')).toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    )
  })
})

// ---------------- crypto ----------------
describe('crypto', () => {
  it('AES CBC roundtrip', () => {
    const opts = { mode: 'CBC' as const, padding: 'Pkcs7' as const, keyFormat: 'Utf8' as const, iv: '00000000000000000000000000000000' }
    const cipher = aesEncrypt('secret message 你好', '0123456789abcdef', opts)
    expect(aesDecrypt(cipher, '0123456789abcdef', opts)).toBe('secret message 你好')
  })
  it('AES wrong key throws', () => {
    const opts = { mode: 'CBC' as const, padding: 'Pkcs7' as const, keyFormat: 'Utf8' as const, iv: '00000000000000000000000000000000' }
    const cipher = aesEncrypt('hi', '0123456789abcdef', opts)
    expect(() => aesDecrypt(cipher, 'wrongkeywrongkey', opts)).toThrow()
  })
  it('password respects length and charset', () => {
    const pw = generatePassword({ length: 20, lowercase: true, uppercase: false, numbers: false, symbols: false, excludeAmbiguous: false })
    expect(pw).toHaveLength(20)
    expect(/^[a-z]+$/.test(pw)).toBe(true)
  })
  it('token hex length', () => {
    expect(generateToken(16, 'hex')).toHaveLength(32)
  })
})

// ---------------- time ----------------
describe('time', () => {
  it('parses seconds and millis', () => {
    expect(parseTimestamp('1600000000').getTime()).toBe(1600000000000)
    expect(parseTimestamp('1600000000000').getTime()).toBe(1600000000000)
  })
  it('describes timestamp', () => {
    const d = describeTimestamp(new Date(1600000000000))
    expect(d.seconds).toBe(1600000000)
    expect(d.millis).toBe(1600000000000)
  })
  it('relative time', () => {
    const now = new Date(1600000000000)
    const past = new Date(1600000000000 - 3 * 3600000)
    expect(relativeTime(past, now)).toContain('小时')
  })
})

// ---------------- cron ----------------
describe('cron', () => {
  it('parses and describes', () => {
    const p = parseCron('0 8 * * *')
    expect(p.description).toContain('08:00')
  })
  it('computes next executions', () => {
    const from = new Date('2026-01-01T00:00:00')
    const next = nextExecutions('0 8 * * *', 2, from)
    expect(next).toHaveLength(2)
    expect(next[0].getHours()).toBe(8)
  })
  it('rejects bad expression', () => {
    expect(() => parseCron('* * *')).toThrow()
  })
})

// ---------------- id ----------------
describe('id', () => {
  it('uuid v4 format', () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('uuid v1 format', () => {
    expect(uuidV1()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
  it('ulid and nanoid batches', () => {
    expect(generateUlid(3)).toHaveLength(3)
    expect(generateNanoId(2, 10)[0]).toHaveLength(10)
    expect(() => generateNanoId(1, 0)).toThrow('NanoID 长度必须是 4 到 64 之间的整数')
    expect(() => generateNanoId(1, 100)).toThrow('NanoID 长度必须是 4 到 64 之间的整数')
    expect(() => generateNanoId(1, 4.5)).toThrow('NanoID 长度必须是 4 到 64 之间的整数')
  })
  it('parses snowflake', () => {
    const parts = parseSnowflake('1541815603606036480')
    expect(parts.timestamp).toBeGreaterThan(0)
    expect(parts.date).toContain('T')
  })
})

// ---------------- text ----------------
describe('text', () => {
  it('stats counts', () => {
    const s = textStats('hello world\nfoo')
    expect(s.words).toBe(3)
    expect(s.lines).toBe(2)
  })
  it('naming conversions', () => {
    expect(convertNaming('hello world', 'camel')).toBe('helloWorld')
    expect(convertNaming('helloWorld', 'snake')).toBe('hello_world')
    expect(convertNaming('HTTPServer', 'kebab')).toBe('http-server')
    const all = convertNamingAll('foo bar')
    expect(all.constant).toBe('FOO_BAR')
    expect(all.pascal).toBe('FooBar')
  })
  it('title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World')
  })
  it('line processing', () => {
    expect(processLines('b\na\nb\n', { dedupe: true, sort: 'asc', removeEmpty: true })).toBe('a\nb')
  })
  it('regex matches with groups', () => {
    const r = testRegex('(\\d+)', 'g', 'a12b34')
    expect(r.matches).toHaveLength(2)
    expect(r.matches[0].groups[0]).toBe('12')
  })
  it('regex invalid', () => {
    expect(testRegex('(', '', 'x').valid).toBe(false)
  })
  it('diff lines', () => {
    const d = diffLines('a\nb\nc', 'a\nx\nc')
    const stats = diffStats(d)
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
    expect(stats.unchanged).toBe(2)
  })
  it('diff chars merges runs', () => {
    const segs = diffChars('abc', 'axc')
    expect(segs.map((s) => s.op + ':' + s.text)).toEqual(['equal:a', 'delete:b', 'insert:x', 'equal:c'])
  })
  it('diff chars handles unicode', () => {
    const segs = diffChars('你好', '你们好')
    expect(segs.find((s) => s.op === 'insert')?.text).toBe('们')
  })
  it('diff lines rejects an oversized LCS matrix', () => {
    const lineCount = Math.floor(Math.sqrt(MAX_DIFF_MATRIX_CELLS)) + 1
    const text = Array.from({ length: lineCount }, (_, i) => String(i)).join('\n')
    expect(() => diffLines(text, text)).toThrow('行级 Diff 计算量超过限制')
  })
  it('diff chars rejects an oversized LCS matrix', () => {
    const charCount = Math.floor(Math.sqrt(MAX_DIFF_MATRIX_CELLS)) + 1
    const text = 'a'.repeat(charCount)
    expect(() => diffChars(text, text)).toThrow('字符级 Diff 计算量超过限制')
  })
  it('json structural diff', () => {
    const entries = diffJson('{"a":1,"b":2,"c":3}', '{"a":1,"b":9,"d":4}')
    const stats = jsonDiffStats(entries)
    expect(stats.changed).toBe(1) // b
    expect(stats.removed).toBe(1) // c
    expect(stats.added).toBe(1) // d
    expect(stats.unchanged).toBe(1) // a
    const changed = entries.find((e) => e.type === 'changed')
    expect(changed?.path).toBe('$.b')
    expect(changed?.left).toBe(2)
    expect(changed?.right).toBe(9)
  })
  it('json diff nested and arrays', () => {
    const entries = diffJson('{"x":{"y":[1,2]}}', '{"x":{"y":[1,3]}}')
    const changed = entries.find((e) => e.type === 'changed')
    expect(changed?.path).toBe('$.x.y[1]')
  })
})

// ---------------- convert ----------------
describe('convert', () => {
  it('radix conversion', () => {
    const r = convertRadix('255', 10)
    expect(r.hex).toBe('FF')
    expect(r.bin).toBe('11111111')
    expect(r.oct).toBe('377')
  })
  it('radix from hex', () => {
    expect(convertRadix('ff', 16).dec).toBe('255')
  })
  it('radix invalid', () => {
    expect(convertRadix('2', 2).valid).toBe(false)
  })
  it('color parse and convert', () => {
    const rgb = parseColor('#ff0000')!
    expect(rgb).toMatchObject({ r: 255, g: 0, b: 0 })
    expect(rgbToHex(rgb)).toBe('#ff0000')
    expect(rgbToHsl(rgb)).toMatchObject({ h: 0, s: 100, l: 50 })
    expect(rgbToHsv(rgb)).toMatchObject({ h: 0, s: 100, v: 100 })
  })
  it('hsl to rgb roundtrip', () => {
    const rgb = hslToRgb({ h: 120, s: 100, l: 50, a: 1 })
    expect(rgb).toMatchObject({ r: 0, g: 255, b: 0 })
  })
  it('parses rgb() and hex short', () => {
    expect(parseColor('rgb(0,0,255)')).toMatchObject({ b: 255 })
    expect(hexToRgb('f00')).toMatchObject({ r: 255, g: 0, b: 0 })
  })
})

// ---------------- formats ----------------
describe('formats', () => {
  it('json <-> yaml', () => {
    const y = jsonToYaml('{"a":1,"b":[1,2]}')
    expect(y).toContain('a: 1')
    expect(JSON.parse(yamlToJson(y))).toEqual({ a: 1, b: [1, 2] })
  })
  it('csv parsing with quotes', () => {
    const rows = parseCsv('a,b\n"x,y",z')
    expect(rows).toEqual([
      ['a', 'b'],
      ['x,y', 'z'],
    ])
  })
  it('csv <-> json', () => {
    const json = csvToJson('name,age\nAlice,30')
    expect(JSON.parse(json)).toEqual([{ name: 'Alice', age: '30' }])
    expect(jsonToCsv('[{"name":"Alice","age":30}]')).toBe('name,age\nAlice,30')
  })
  it('csv to markdown', () => {
    expect(csvToMarkdown('a,b\n1,2')).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })
  it('markdown table to csv', () => {
    expect(markdownToCsv('| a | b |\n| --- | --- |\n| 1 | 2 |')).toBe('a,b\n1,2')
  })
  it('parses markdown table skipping separator', () => {
    const rows = parseMarkdownTable('| x | y |\n|:--|--:|\n| 1 | 2 |\n| 3 | 4 |')
    expect(rows).toEqual([['x', 'y'], ['1', '2'], ['3', '4']])
  })
  it('csv <-> markdown roundtrip', () => {
    const md = csvToMarkdown('name,age\nAlice,30')
    expect(markdownToCsv(md)).toBe('name,age\nAlice,30')
  })
  it('json to xml', () => {
    expect(jsonToXml('{"a":1}')).toContain('<a>1</a>')
  })
  it('xml to json', () => {
    const j = xmlToJson('<root><a>1</a><b>hi</b></root>')
    expect(JSON.parse(j)).toEqual({ root: { a: 1, b: 'hi' } })
  })
  it('xml to json with attrs and repeated tags', () => {
    const j = xmlToJson('<list count="2"><item>a</item><item>b</item></list>')
    expect(JSON.parse(j)).toEqual({ list: { '@count': '2', item: ['a', 'b'] } })
  })
  it('xml to json self-closing', () => {
    expect(JSON.parse(xmlToJson('<root><x/></root>'))).toEqual({ root: { x: null } })
  })
  it('xml roundtrip json->xml->json', () => {
    const xml = jsonToXml('{"a":1,"b":"x"}', 'root')
    expect(JSON.parse(xmlToJson(xml))).toEqual({ root: { a: 1, b: 'x' } })
  })
  it('format and minify xml', () => {
    const fmt = formatXml('<root><a>1</a></root>')
    expect(fmt).toContain('\n  <a>1</a>')
    expect(minifyXml('<root>\n  <a>1</a>\n</root>')).toBe('<root><a>1</a></root>')
  })
  it('validates xml', () => {
    expect(validateXml('<root><a>1</a></root>').valid).toBe(true)
    expect(validateXml('<root><a>1</b></root>').valid).toBe(false)
    expect(validateXml('<root><a>1</a>').valid).toBe(false)
  })
  it('sql format and minify', () => {
    const f = formatSql('select * from t where a=1 and b=2')
    expect(f).toContain('SELECT')
    expect(f).toContain('\nWHERE')
    expect(minifySql('a\n  b')).toBe('a b')
  })
  it('sql dialect-specific keywords', () => {
    const my = formatSql('insert into t values (1) on duplicate key update a=1', true, 'mysql')
    expect(my).toContain('ON DUPLICATE KEY UPDATE')
    const pg = formatSql('insert into t values (1) returning id', true, 'postgresql')
    expect(pg).toContain('\nRETURNING')
    const lite = formatSql('insert or replace into t values (1)', true, 'sqlite')
    expect(lite).toContain('INSERT OR REPLACE')
  })
  it('json to typescript', () => {
    const ts = jsonToTypes('{"id":1,"name":"x","tags":["a"]}', 'typescript', 'User')
    expect(ts).toContain('export interface User')
    expect(ts).toContain('id: number')
    expect(ts).toContain('tags: string[]')
  })
  it('json to go', () => {
    const go = jsonToTypes('{"id":1}', 'go', 'User')
    expect(go).toContain('type User struct')
    expect(go).toContain('json:"id"')
  })
})

// ---------------- toml ----------------
describe('toml', () => {
  it('parses key/value and tables', () => {
    const obj = parseToml('title = "x"\nn = 3\nf = 1.5\nb = true\n\n[owner]\nname = "Tom"')
    expect(obj).toEqual({ title: 'x', n: 3, f: 1.5, b: true, owner: { name: 'Tom' } })
  })
  it('parses array of tables', () => {
    const obj = parseToml('[[srv]]\nhost = "a"\n[[srv]]\nhost = "b"')
    expect(obj).toEqual({ srv: [{ host: 'a' }, { host: 'b' }] })
  })
  it('parses arrays and inline tables', () => {
    const obj = parseToml('nums = [1, 2, 3]\npt = { x = 1, y = 2 }')
    expect(obj).toEqual({ nums: [1, 2, 3], pt: { x: 1, y: 2 } })
  })
  it('handles comments and dotted keys', () => {
    const obj = parseToml('# comment\na.b.c = 1 # trailing')
    expect(obj).toEqual({ a: { b: { c: 1 } } })
  })
  it('toml <-> json roundtrip', () => {
    const toml = 'title = "x"\n\n[db]\nport = 5432'
    const json = tomlToJson(toml)
    expect(JSON.parse(json)).toEqual({ title: 'x', db: { port: 5432 } })
    const back = jsonToToml(json)
    expect(JSON.parse(tomlToJson(back))).toEqual({ title: 'x', db: { port: 5432 } })
  })
  it('emits array of tables', () => {
    const toml = jsonToToml('{"srv":[{"host":"a"},{"host":"b"}]}')
    expect(toml).toContain('[[srv]]')
    expect(parseToml(toml)).toEqual({ srv: [{ host: 'a' }, { host: 'b' }] })
  })
})

// ---------------- rsa ----------------
describe('rsa', () => {
  it('generates key pair and roundtrips encryption', async () => {
    const pair = await generateRsaKeyPair(2048)
    expect(pair.publicKey).toContain('BEGIN PUBLIC KEY')
    expect(pair.privateKey).toContain('BEGIN PRIVATE KEY')
    const msg = 'secret 你好 🚀'
    const cipher = await rsaEncrypt(pair.publicKey, msg)
    expect(cipher).not.toBe(msg)
    const plain = await rsaDecrypt(pair.privateKey, cipher)
    expect(plain).toBe(msg)
  }, 20000)
  it('wrong key fails to decrypt', async () => {
    const a = await generateRsaKeyPair(2048)
    const b = await generateRsaKeyPair(2048)
    const cipher = await rsaEncrypt(a.publicKey, 'hi')
    await expect(rsaDecrypt(b.privateKey, cipher)).rejects.toThrow()
  }, 20000)
})

// ---------------- network ----------------
describe('network', () => {
  it('calculates subnet', () => {
    const s = calcSubnet('192.168.1.10/24')
    expect(s.valid).toBe(true)
    expect(s.network).toBe('192.168.1.0')
    expect(s.broadcast).toBe('192.168.1.255')
    expect(s.netmask).toBe('255.255.255.0')
    expect(s.usableHostCount).toBe(254)
    expect(s.isPrivate).toBe(true)
  })
  it('rejects bad ip', () => {
    expect(calcSubnet('999.1.1.1/24').valid).toBe(false)
  })
  it('parses user agent', () => {
    const ua = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    expect(ua.browser).toBe('Chrome')
    expect(ua.os).toBe('Windows')
  })
})

// ---------------- mock ----------------
describe('mock', () => {
  it('generates rows with keys', () => {
    const rows = generateMockData(
      [
        { key: 'name', type: 'name' },
        { key: 'phone', type: 'phone' },
      ],
      5,
    )
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveProperty('name')
    expect(String(rows[0].phone)).toMatch(/^1\d{10}$/)
  })
  it('id card passes checksum', () => {
    const id = mockIdCard()
    expect(id).toHaveLength(18)
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const checkMap = '10X98765432'
    let sum = 0
    for (let i = 0; i < 17; i++) sum += Number(id[i]) * weights[i]
    expect(checkMap[sum % 11]).toBe(id[17])
  })
  it('mock to csv', () => {
    const csv = mockToCsv([{ a: '1', b: '2' }])
    expect(csv).toBe('a,b\n1,2')
  })
})
