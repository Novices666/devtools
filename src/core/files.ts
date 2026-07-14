/** 根据 BOM 或严格 UTF-8 规则解码文本文件字节。 */
export function decodeTextFileBytes(bytes: Uint8Array): string {
  try {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(3))
    }
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le', { fatal: true }).decode(bytes.subarray(2))
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be', { fatal: true }).decode(bytes.subarray(2))
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('文件编码无法识别，仅支持 UTF-8 或带 BOM 的 UTF-16 文本')
  }
}

/** 读取并严格解码文本文件。 */
export async function readTextFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer()
    return decodeTextFileBytes(new Uint8Array(buffer))
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith('文件编码无法识别')) throw reason
    throw new Error(`文件读取失败: ${reason instanceof Error ? reason.message : String(reason)}`)
  }
}
