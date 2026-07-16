import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { isDesktop } from './desktop'
import { dataUrlToBytes, saveGeneratedFile } from './generatedFile'

vi.mock('./desktop', () => ({ isDesktop: vi.fn(() => false) }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }))

beforeEach(() => {
  vi.mocked(isDesktop).mockReturnValue(false)
  vi.mocked(save).mockReset()
  vi.mocked(writeFile).mockReset()
})

afterEach(() => vi.restoreAllMocks())

describe('generated file saving', () => {
  it('decodes base64 and percent-encoded data URLs', () => {
    expect(dataUrlToBytes('data:image/png;base64,AQID')).toEqual(Uint8Array.from([1, 2, 3]))
    expect(new TextDecoder().decode(dataUrlToBytes('data:image/svg+xml,%3Csvg%3E'))).toBe(
      '<svg>',
    )
  })

  it('keeps browser downloads as the web fallback', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await expect(
      saveGeneratedFile({
        dataUrl: 'data:image/png;base64,AQID',
        fileName: 'image.png',
        filterName: 'PNG 图片',
        extensions: ['png'],
      }),
    ).resolves.toBe('downloaded')

    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="image.png"]')).toBeNull()
  })

  it('writes desktop files only after the user selects a path', async () => {
    vi.mocked(isDesktop).mockReturnValue(true)
    vi.mocked(save).mockResolvedValue('C:\\Users\\tester\\image.png')
    vi.mocked(writeFile).mockResolvedValue()

    await expect(
      saveGeneratedFile({
        dataUrl: 'data:image/png;base64,AQID',
        fileName: 'image.png',
        filterName: 'PNG 图片',
        extensions: ['png'],
      }),
    ).resolves.toBe('saved')

    expect(save).toHaveBeenCalledWith({
      title: '保存文件',
      defaultPath: 'image.png',
      filters: [{ name: 'PNG 图片', extensions: ['png'] }],
    })
    expect(writeFile).toHaveBeenCalledWith(
      'C:\\Users\\tester\\image.png',
      Uint8Array.from([1, 2, 3]),
    )
  })

  it('does not write a desktop file when the dialog is cancelled', async () => {
    vi.mocked(isDesktop).mockReturnValue(true)
    vi.mocked(save).mockResolvedValue(null)

    await expect(
      saveGeneratedFile({
        dataUrl: 'data:image/png;base64,AQID',
        fileName: 'image.png',
        filterName: 'PNG 图片',
        extensions: ['png'],
      }),
    ).resolves.toBe('cancelled')
    expect(writeFile).not.toHaveBeenCalled()
  })
})
