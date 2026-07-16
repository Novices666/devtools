const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

/** 优先使用图片 MIME，缺失时根据共享支持的文件扩展名推断。 */
export function inferImageMime(file: Pick<File, 'name' | 'type'>): string | null {
  const declaredType = file.type.toLowerCase()
  if (declaredType.startsWith('image/')) return declaredType
  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1]
  return extension ? IMAGE_MIME_BY_EXTENSION[extension] ?? null : null
}

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
