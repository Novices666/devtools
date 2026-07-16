import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

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
    const { getByRole, getAllByRole, queryByRole } = render(<App />)
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
})
