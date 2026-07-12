// JWT 解析与校验
import CryptoJS from 'crypto-js'
import { base64ToText } from './encoding'

export interface JwtParsed {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  raw: { header: string; payload: string; signature: string }
}

/** 解析 JWT 三段，不校验签名 */
export function parseJwt(token: string): JwtParsed {
  const parts = token.trim().split('.')
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('JWT 格式错误：应为 header.payload.signature 三段')
  }
  const [h, p, s = ''] = parts
  let header: Record<string, unknown>
  let payload: Record<string, unknown>
  try {
    header = JSON.parse(base64ToText(h))
  } catch {
    throw new Error('Header 解析失败：非合法 Base64URL/JSON')
  }
  try {
    payload = JSON.parse(base64ToText(p))
  } catch {
    throw new Error('Payload 解析失败：非合法 Base64URL/JSON')
  }
  return { header, payload, signature: s, raw: { header: h, payload: p, signature: s } }
}

/** JWT 中常见时间字段 */
export const JWT_TIME_CLAIMS = ['exp', 'iat', 'nbf', 'auth_time', 'updated_at'] as const

export const JWT_CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: '签发者 (Issuer)',
  sub: '主题 / 用户标识 (Subject)',
  aud: '受众 (Audience)',
  exp: '过期时间 (Expiration Time)',
  nbf: '生效时间 (Not Before)',
  iat: '签发时间 (Issued At)',
  jti: 'JWT 唯一标识 (JWT ID)',
  auth_time: '认证时间',
  scope: '权限范围',
  typ: '类型',
  alg: '签名算法',
  kid: '密钥 ID',
}

export interface JwtStatus {
  expired: boolean | null
  notYetValid: boolean | null
  expiresAt: Date | null
  issuedAt: Date | null
}

export function jwtStatus(payload: Record<string, unknown>, now = Date.now()): JwtStatus {
  const nowSec = Math.floor(now / 1000)
  const exp = typeof payload.exp === 'number' ? payload.exp : null
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null
  const iat = typeof payload.iat === 'number' ? payload.iat : null
  return {
    expired: exp === null ? null : nowSec >= exp,
    notYetValid: nbf === null ? null : nowSec < nbf,
    expiresAt: exp === null ? null : new Date(exp * 1000),
    issuedAt: iat === null ? null : new Date(iat * 1000),
  }
}

function base64url(wordArray: CryptoJS.lib.WordArray): string {
  return CryptoJS.enc.Base64.stringify(wordArray)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** 校验 HMAC 系列签名（HS256/384/512） */
export function verifyJwtHmac(token: string, secret: string): boolean {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('JWT 需包含 signature 段才能校验')
  const { header } = parseJwt(token)
  const alg = String(header.alg || '').toUpperCase()
  const signingInput = `${parts[0]}.${parts[1]}`
  let hash: CryptoJS.lib.WordArray
  switch (alg) {
    case 'HS256':
      hash = CryptoJS.HmacSHA256(signingInput, secret)
      break
    case 'HS384':
      hash = CryptoJS.HmacSHA384(signingInput, secret)
      break
    case 'HS512':
      hash = CryptoJS.HmacSHA512(signingInput, secret)
      break
    default:
      throw new Error(`暂不支持校验算法：${alg || '未知'}（仅支持 HS256/384/512）`)
  }
  return base64url(hash) === parts[2]
}

/** JWT 算法分类 */
export function jwtAlgFamily(alg: string): 'HMAC' | 'RSA' | 'RSA-PSS' | 'EC' | 'none' | 'unknown' {
  const a = alg.toUpperCase()
  if (a === 'NONE') return 'none'
  if (/^HS(256|384|512)$/.test(a)) return 'HMAC'
  if (/^RS(256|384|512)$/.test(a)) return 'RSA'
  if (/^PS(256|384|512)$/.test(a)) return 'RSA-PSS'
  if (/^ES(256|384|512)$/.test(a)) return 'EC'
  return 'unknown'
}

// ---------- 非对称签名校验（RS/PS/ES 系列，WebCrypto） ----------

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

const EC_CURVE: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' }
const SHA_BY_ALG: Record<string, string> = {
  RS256: 'SHA-256', RS384: 'SHA-384', RS512: 'SHA-512',
  PS256: 'SHA-256', PS384: 'SHA-384', PS512: 'SHA-512',
  ES256: 'SHA-256', ES384: 'SHA-384', ES512: 'SHA-512',
}

/**
 * 校验非对称签名 JWT（RS256/384/512、PS256/384/512、ES256/384/512）。
 * publicKeyPem 为 SPKI/PEM 格式公钥（-----BEGIN PUBLIC KEY-----）。
 */
export async function verifyJwtAsymmetric(token: string, publicKeyPem: string): Promise<boolean> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('JWT 需包含 signature 段才能校验')
  const { header } = parseJwt(token)
  const alg = String(header.alg || '').toUpperCase()
  const family = jwtAlgFamily(alg)
  const hash = SHA_BY_ALG[alg]
  if (!hash || (family !== 'RSA' && family !== 'RSA-PSS' && family !== 'EC')) {
    throw new Error(`verifyJwtAsymmetric 不支持算法：${alg || '未知'}`)
  }
  if (!('crypto' in globalThis) || !globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持 WebCrypto，无法校验非对称签名')
  }

  let algParams: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams
  let verifyParams: AlgorithmIdentifier | RsaPssParams | EcdsaParams
  if (family === 'RSA') {
    algParams = { name: 'RSASSA-PKCS1-v1_5', hash }
    verifyParams = { name: 'RSASSA-PKCS1-v1_5' }
  } else if (family === 'RSA-PSS') {
    algParams = { name: 'RSA-PSS', hash }
    const saltLen = { 'SHA-256': 32, 'SHA-384': 48, 'SHA-512': 64 }[hash] ?? 32
    verifyParams = { name: 'RSA-PSS', saltLength: saltLen }
  } else {
    const curve = EC_CURVE[alg]
    algParams = { name: 'ECDSA', namedCurve: curve }
    verifyParams = { name: 'ECDSA', hash }
  }

  const key = await globalThis.crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    algParams,
    false,
    ['verify'],
  )
  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const sig = b64urlToBytes(parts[2])
  // ECDSA：JWT 使用 raw (r||s) 编码，WebCrypto verify 也接受 raw，无需转换
  const sigBuf = sig.buffer.slice(sig.byteOffset, sig.byteOffset + sig.byteLength) as ArrayBuffer
  return globalThis.crypto.subtle.verify(verifyParams, key, sigBuf, signingInput)
}
