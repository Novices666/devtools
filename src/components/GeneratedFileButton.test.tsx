import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeneratedFileButton } from './GeneratedFileButton'
import { saveGeneratedFile } from '../core/generatedFile'

vi.mock('../core/generatedFile', () => ({
  saveGeneratedFile: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(saveGeneratedFile).mockReset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const props = {
  dataUrl: 'data:image/png;base64,AQID',
  fileName: 'image.png',
  filterName: 'PNG 图片',
  extensions: ['png'] as string[],
}

describe('GeneratedFileButton', () => {
  it('shows saved feedback after desktop save', async () => {
    vi.mocked(saveGeneratedFile).mockResolvedValue('saved')
    const { getByRole } = render(<GeneratedFileButton {...props}>下载 PNG</GeneratedFileButton>)

    fireEvent.click(getByRole('button', { name: '下载 PNG' }))
    await waitFor(() => expect(getByRole('button', { name: '✓ 已保存' })).toBeTruthy())
  })

  it('shows cancelled feedback when the dialog is dismissed', async () => {
    vi.mocked(saveGeneratedFile).mockResolvedValue('cancelled')
    const { getByRole } = render(<GeneratedFileButton {...props}>下载 PNG</GeneratedFileButton>)

    fireEvent.click(getByRole('button', { name: '下载 PNG' }))
    await waitFor(() => expect(getByRole('button', { name: '已取消' })).toBeTruthy())
  })

  it('shows downloaded feedback on web', async () => {
    vi.mocked(saveGeneratedFile).mockResolvedValue('downloaded')
    const { getByRole } = render(<GeneratedFileButton {...props}>下载 PNG</GeneratedFileButton>)

    fireEvent.click(getByRole('button', { name: '下载 PNG' }))
    await waitFor(() => expect(getByRole('button', { name: '✓ 已下载' })).toBeTruthy())
  })

  it('reports failures via onError and restores the default label', async () => {
    vi.mocked(saveGeneratedFile).mockRejectedValue(new Error('disk full'))
    const onError = vi.fn()
    const { getByRole } = render(
      <GeneratedFileButton {...props} onError={onError}>
        下载 PNG
      </GeneratedFileButton>,
    )

    fireEvent.click(getByRole('button', { name: '下载 PNG' }))
    await waitFor(() => expect(onError).toHaveBeenCalledWith('保存失败：disk full'))
    expect(getByRole('button', { name: '下载 PNG' })).toBeTruthy()
  })
})
