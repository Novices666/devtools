// RSA 加解密与密钥对生成，基于 WebCrypto（SubtleCrypto）
// 加解密使用 RSA-OAEP（SHA-256）。密钥以 PEM 文本表示。

export interface RsaKeyPair {
  publicKey: string // SPKI PEM
  privateKey: string // PKCS8 PEM
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function toPem(buf: ArrayBuffer, label: string): string {
  const b64 = arrayBufferToBase64(buf)
  const lines = b64.match(/.{1,64}/g) ?? []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

function fromPem(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '')
  return base64ToArrayBuffer(body)
}

/** 生成 RSA-OAEP 密钥对，返回 PEM 文本 */
export async function generateRsaKeyPair(modulusLength = 2048): Promise<RsaKeyPair> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey)
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey)
  return {
    publicKey: toPem(spki, 'PUBLIC KEY'),
    privateKey: toPem(pkcs8, 'PRIVATE KEY'),
  }
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', fromPem(pem), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', fromPem(pem), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt'])
}

/** 用公钥加密文本，返回 Base64 密文 */
export async function rsaEncrypt(publicKeyPem: string, plaintext: string): Promise<string> {
  const key = await importPublicKey(publicKeyPem)
  const data = new TextEncoder().encode(plaintext)
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data)
  return arrayBufferToBase64(cipher)
}

/** 用私钥解密 Base64 密文，返回明文 */
export async function rsaDecrypt(privateKeyPem: string, ciphertextB64: string): Promise<string> {
  const key = await importPrivateKey(privateKeyPem)
  const plain = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, base64ToArrayBuffer(ciphertextB64))
  return new TextDecoder().decode(plain)
}
