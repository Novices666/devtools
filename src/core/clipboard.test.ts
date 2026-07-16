import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand')

afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
  if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand)
  else Reflect.deleteProperty(document, 'execCommand')
  document.querySelectorAll('textarea').forEach((element) => element.remove())
})

describe('copyText', () => {
  it('returns true when the Clipboard API succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await expect(copyText('value')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('value')
  })

  it('uses execCommand after a Clipboard API failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

    await expect(copyText('fallback')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('returns false when both copy methods fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    })

    await expect(copyText('value')).resolves.toBe(false)
  })
})
