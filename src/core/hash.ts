// 哈希与 HMAC 计算
import CryptoJS from 'crypto-js'

export type HashAlgo = 'MD5' | 'SHA1' | 'SHA256' | 'SHA384' | 'SHA512'

export const HASH_ALGOS: HashAlgo[] = ['MD5', 'SHA1', 'SHA256', 'SHA384', 'SHA512']

const HASHERS: Record<HashAlgo, (msg: string | CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray> = {
  MD5: CryptoJS.MD5,
  SHA1: CryptoJS.SHA1,
  SHA256: CryptoJS.SHA256,
  SHA384: CryptoJS.SHA384,
  SHA512: CryptoJS.SHA512,
}

/** 对文本计算指定算法哈希，返回 hex 字符串 */
export function hashText(text: string, algo: HashAlgo): string {
  return HASHERS[algo](text).toString(CryptoJS.enc.Hex)
}

/** 一次性计算文本的所有哈希 */
export function hashAll(text: string): Record<HashAlgo, string> {
  return HASH_ALGOS.reduce((acc, algo) => {
    acc[algo] = hashText(text, algo)
    return acc
  }, {} as Record<HashAlgo, string>)
}

/** 对 ArrayBuffer（文件）计算哈希 */
export function hashArrayBuffer(buffer: ArrayBuffer, algo: HashAlgo): string {
  const wordArray = CryptoJS.lib.WordArray.create(buffer as unknown as number[])
  return HASHERS[algo](wordArray).toString(CryptoJS.enc.Hex)
}

const HMAC_FNS: Record<HashAlgo, (msg: string, key: string) => CryptoJS.lib.WordArray> = {
  MD5: CryptoJS.HmacMD5,
  SHA1: CryptoJS.HmacSHA1,
  SHA256: CryptoJS.HmacSHA256,
  SHA384: CryptoJS.HmacSHA384,
  SHA512: CryptoJS.HmacSHA512,
}

export type HmacOutput = 'hex' | 'base64'

/** HMAC 计算 */
export function hmac(text: string, key: string, algo: HashAlgo, output: HmacOutput = 'hex'): string {
  const result = HMAC_FNS[algo](text, key)
  return output === 'hex'
    ? result.toString(CryptoJS.enc.Hex)
    : result.toString(CryptoJS.enc.Base64)
}
