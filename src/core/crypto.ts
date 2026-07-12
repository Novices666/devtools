// 对称加密 (AES) 与随机生成
import CryptoJS from 'crypto-js'

export type AesMode = 'CBC' | 'ECB' | 'CFB' | 'OFB' | 'CTR'
export type AesPadding = 'Pkcs7' | 'NoPadding' | 'ZeroPadding' | 'Iso10126'
export type KeyFormat = 'Utf8' | 'Hex' | 'Base64'

function parseKey(key: string, format: KeyFormat): CryptoJS.lib.WordArray {
  switch (format) {
    case 'Hex':
      return CryptoJS.enc.Hex.parse(key)
    case 'Base64':
      return CryptoJS.enc.Base64.parse(key)
    default:
      return CryptoJS.enc.Utf8.parse(key)
  }
}

interface AesOptions {
  mode: AesMode
  padding: AesPadding
  keyFormat: KeyFormat
  iv?: string
}

type CipherCfg = Parameters<typeof CryptoJS.AES.encrypt>[2]

function buildConfig(opts: AesOptions): CipherCfg {
  const cfg: CipherCfg = {
    mode: CryptoJS.mode[opts.mode],
    padding: CryptoJS.pad[opts.padding],
  }
  if (opts.mode !== 'ECB' && opts.iv) {
    cfg.iv = parseKey(opts.iv, 'Hex')
  }
  return cfg
}

/** AES 加密，输出 Base64 */
export function aesEncrypt(plain: string, key: string, opts: AesOptions): string {
  const keyWa = parseKey(key, opts.keyFormat)
  const encrypted = CryptoJS.AES.encrypt(plain, keyWa, buildConfig(opts))
  return encrypted.toString()
}

/** AES 解密，输入 Base64 */
export function aesDecrypt(cipher: string, key: string, opts: AesOptions): string {
  const keyWa = parseKey(key, opts.keyFormat)
  const decrypted = CryptoJS.AES.decrypt(cipher, keyWa, buildConfig(opts))
  const text = decrypted.toString(CryptoJS.enc.Utf8)
  if (!text) throw new Error('解密失败：密钥/IV/模式不匹配或密文无效')
  return text
}

// ---- 随机生成 ----

export interface PasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

const CHARSET = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
}
const AMBIGUOUS = /[Il1O0o]/g

/** 使用 crypto.getRandomValues 生成安全随机密码 */
export function generatePassword(opts: PasswordOptions): string {
  let pool = ''
  if (opts.lowercase) pool += CHARSET.lowercase
  if (opts.uppercase) pool += CHARSET.uppercase
  if (opts.numbers) pool += CHARSET.numbers
  if (opts.symbols) pool += CHARSET.symbols
  if (opts.excludeAmbiguous) pool = pool.replace(AMBIGUOUS, '')
  if (!pool) throw new Error('请至少选择一种字符类型')

  const out: string[] = []
  const rand = new Uint32Array(opts.length)
  crypto.getRandomValues(rand)
  for (let i = 0; i < opts.length; i++) {
    out.push(pool[rand[i] % pool.length])
  }
  return out.join('')
}

/** 生成随机 hex/base64 token */
export function generateToken(bytes: number, format: 'hex' | 'base64' = 'hex'): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  if (format === 'hex') {
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let bin = ''
  arr.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}
