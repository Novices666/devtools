import { isDesktop } from './desktop'

export interface GeneratedFileOptions {
  dataUrl: string
  fileName: string
  filterName: string
  extensions: string[]
}

export type GeneratedFileResult = 'saved' | 'cancelled' | 'downloaded'

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || commaIndex < 0) {
    throw new Error('文件数据格式无效')
  }

  const metadata = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  if (metadata.split(';').includes('base64')) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  return new TextEncoder().encode(decodeURIComponent(payload))
}

function downloadInBrowser(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export async function saveGeneratedFile({
  dataUrl,
  fileName,
  filterName,
  extensions,
}: GeneratedFileOptions): Promise<GeneratedFileResult> {
  if (!isDesktop()) {
    downloadInBrowser(dataUrl, fileName)
    return 'downloaded'
  }

  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const path = await save({
    title: '保存文件',
    defaultPath: fileName,
    filters: [{ name: filterName, extensions }],
  })
  if (!path) return 'cancelled'

  await writeFile(path, dataUrlToBytes(dataUrl))
  return 'saved'
}
