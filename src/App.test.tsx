import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App, NON_TEXT_FILE_HINT } from './App'

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function textFile(name: string, content: string): File {
  const file = new File([content], name, { type: 'text/plain' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new TextEncoder().encode(content).buffer),
  })
  return file
}

function imageFile(name: string): File {
  // 1x1 PNG
  const bytes = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
    (c) => c.charCodeAt(0),
  )
  const file = new File([bytes], name, { type: 'image/png' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(bytes.buffer),
  })
  return file
}

describe('application file drop', () => {
  it('opens a file dropped outside a tool input and fills the detected tool', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('text-transform'))
    const { container, getByRole, getAllByRole } = render(<App />)
    const file = textFile('payload.json', '{"name":"desktop-drop"}')

    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' },
    })

    await waitFor(() => expect(getByRole('heading', { name: 'JSON 工具' })).toBeTruthy())
    const input = getAllByRole('textbox').find((element) => element instanceof HTMLTextAreaElement)
    await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe('{"name":"desktop-drop"}'))
  })

  it('lets a tool input handle its own drop without triggering whole-window routing', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('hash'))
    const { findByRole, getByRole, getAllByRole, queryByRole } = render(<App />)
    await findByRole('heading', { name: '哈希计算' })
    const input = getAllByRole('textbox').find(
      (element) => element instanceof HTMLTextAreaElement,
    ) as HTMLTextAreaElement
    const file = textFile('payload.json', '{"local":true}')

    fireEvent.drop(input, {
      dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' },
    })

    await waitFor(() => expect(input.value).toBe('{"local":true}'))
    expect(getByRole('heading', { name: '哈希计算' })).toBeTruthy()
    expect(queryByRole('heading', { name: 'JSON 工具' })).toBeNull()
  })

  it('routes window-dropped images to the image tool instead of text decode error', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('json'))
    const { container, findByRole, getByRole, queryByText } = render(<App />)
    await findByRole('heading', { name: 'JSON 工具' })
    const file = imageFile('dot.png')

    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' },
    })

    await waitFor(() => expect(getByRole('heading', { name: '图片工具' })).toBeTruthy())
    expect(queryByText(/文件打开失败/)).toBeNull()
  })

  it('keeps tool input when switching tools within the same session', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('json'))
    const { findByRole, getAllByRole } = render(<App />)
    await findByRole('heading', { name: 'JSON 工具' })
    const textarea = getAllByRole('textbox').find(
      (el) => el instanceof HTMLTextAreaElement && !(el as HTMLTextAreaElement).readOnly,
    ) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '{"keep":true}' } })
    expect(textarea.value).toBe('{"keep":true}')

    // 侧边栏导航按钮文案前带图标字符
    fireEvent.click(getAllByRole('button').find((b) => /YAML 工具/.test(b.textContent || ''))!)
    await findByRole('heading', { name: 'YAML 工具' })

    fireEvent.click(getAllByRole('button').find((b) => /JSON 工具/.test(b.textContent || '') && !/转类型/.test(b.textContent || ''))!)
    await findByRole('heading', { name: 'JSON 工具' })
    const again = getAllByRole('textbox').find(
      (el) => el instanceof HTMLTextAreaElement && !(el as HTMLTextAreaElement).readOnly,
    ) as HTMLTextAreaElement
    expect(again.value).toBe('{"keep":true}')
  })

  it('shows a friendly hint for non-text binary drops outside hash tool', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('json'))
    const { container, findByRole, findByText } = render(<App />)
    await findByRole('heading', { name: 'JSON 工具' })
    const bytes = new Uint8Array([0x00, 0x01, 0xff, 0xfe, 0x80])
    const file = new File([bytes], 'blob.bin', { type: 'application/octet-stream' })
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(bytes.buffer),
    })

    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' },
    })

    await findByText(new RegExp(NON_TEXT_FILE_HINT.slice(0, 12)))
  })

  it('routes window-dropped files to Base 工具原始字节编码', async () => {
    localStorage.setItem('devtoolbox:current', JSON.stringify('base64'))
    const { container, findByRole, getByText, getAllByRole } = render(<App />)
    await findByRole('heading', { name: 'Base 编解码' })
    const bytes = new TextEncoder().encode('abc')
    const file = new File([bytes], 'payload.bin', { type: 'application/octet-stream' })
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(bytes.buffer),
    })

    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: { types: ['Files'], files: [file], dropEffect: 'none' },
    })

    await waitFor(() => expect(getByText('文件：payload.bin')).toBeTruthy())
    const output = getAllByRole('textbox').find((element) => element instanceof HTMLTextAreaElement)
    expect((output as HTMLTextAreaElement).value).toBe('YWJj')
  })
})
