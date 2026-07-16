import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, act, fireEvent, waitFor } from '@testing-library/react'
import { TOOLS } from '../registry'
import { SettingsPanel } from '../components/SettingsPanel'
import { FileDropInput, TextArea } from '../components/ui'
import { setSettings } from '../hooks/useSettings'

// 为不支持 jsdom 的浏览器 API 提供最小 mock，避免渲染阶段崩溃
beforeAllMocks()

function beforeAllMocks() {
  // matchMedia（主题相关组件可能间接触发）
  if (!window.matchMedia) {
    // @ts-expect-error 测试环境补丁
    window.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  }
  // clipboard
  if (!navigator.clipboard) {
    // @ts-expect-error 测试环境补丁
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  }
}

afterEach(() => cleanup())

describe('工具组件冒烟测试', () => {
  it('图片文件拖放组件只接管符合类型的文件', () => {
    const onFile = vi.fn()
    const onReject = vi.fn()
    const { getByText } = render(
      <FileDropInput accept="image/*" onFile={onFile} onReject={onReject}>
        <span>拖放图片</span>
      </FileDropInput>,
    )
    const zone = getByText('拖放图片').closest('label')!
    const image = new File(['png'], 'sample.png', { type: 'image/png' })
    const extensionOnlyImage = new File(['png'], 'sample.png')
    const textFile = new File(['text'], 'sample.txt', { type: 'text/plain' })

    expect(
      fireEvent.dragOver(zone, {
        dataTransfer: { types: ['text/plain'], files: [], dropEffect: 'none' },
      }),
    ).toBe(true)
    fireEvent.drop(zone, {
      dataTransfer: { types: ['Files'], files: [image], dropEffect: 'none' },
    })
    expect(onFile).toHaveBeenCalledWith(image)

    fireEvent.drop(zone, {
      dataTransfer: { types: ['Files'], files: [extensionOnlyImage], dropEffect: 'none' },
    })
    expect(onFile).toHaveBeenCalledWith(extensionOnlyImage)

    fireEvent.drop(zone, {
      dataTransfer: { types: ['Files'], files: [textFile], dropEffect: 'none' },
    })
    expect(onReject).toHaveBeenCalledWith(textFile)
  })

  it('文本文件拖放不拦截普通文本并显示解码错误', async () => {
    const onFileText = vi.fn()
    const { getByRole, getByText } = render(<TextArea onFileText={onFileText} />)
    const textArea = getByRole('textbox')

    expect(
      fireEvent.dragOver(textArea, {
        dataTransfer: { types: ['text/plain'], files: [], dropEffect: 'none' },
      }),
    ).toBe(true)

    const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' })
    Object.defineProperty(invalidFile, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(Uint8Array.from([0x81]).buffer),
    })
    fireEvent.drop(textArea, {
      dataTransfer: { types: ['Files'], files: [invalidFile], dropEffect: 'none' },
    })

    await waitFor(() => expect(getByText(/文件编码无法识别/)).toBeTruthy())
    expect(onFileText).not.toHaveBeenCalled()
  })

  it('文本框连续拖入文件时只使用最后一次读取结果', async () => {
    let resolveFirst!: (value: ArrayBuffer) => void
    const firstRead = new Promise<ArrayBuffer>((resolve) => { resolveFirst = resolve })
    const first = new File(['first'], 'first.txt', { type: 'text/plain' })
    const second = new File(['second'], 'second.txt', { type: 'text/plain' })
    Object.defineProperty(first, 'arrayBuffer', { value: vi.fn(() => firstRead) })
    Object.defineProperty(second, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode('second').buffer),
    })
    const onFileText = vi.fn()
    const { getByRole } = render(<TextArea onFileText={onFileText} />)
    const textArea = getByRole('textbox')

    fireEvent.drop(textArea, {
      dataTransfer: { types: ['Files'], files: [first], dropEffect: 'none' },
    })
    fireEvent.drop(textArea, {
      dataTransfer: { types: ['Files'], files: [second], dropEffect: 'none' },
    })
    await waitFor(() => expect(onFileText).toHaveBeenCalledWith('second', second))

    await act(async () => resolveFirst(new TextEncoder().encode('first').buffer))
    expect(onFileText).toHaveBeenCalledTimes(1)
  })

  it('Diff 工具将超限计算显示为错误提示', () => {
    const DiffTool = TOOLS.find((tool) => tool.id === 'diff')!.component
    const { getAllByRole, getByText } = render(<DiffTool />)
    const textareas = getAllByRole('textbox') as HTMLTextAreaElement[]
    const largeText = 'a'.repeat(1500)

    fireEvent.click(getByText('字符级'))
    fireEvent.change(textareas[0], { target: { value: largeText } })
    fireEvent.change(textareas[1], { target: { value: largeText } })

    expect(getByText(/字符级 Diff 计算量超过限制/)).toBeTruthy()
  })

  it('哈希工具按拖放目标区分文件哈希与文本输入', async () => {
    const HashTool = TOOLS.find((tool) => tool.id === 'hash')!.component
    const { getByText, getByRole, queryByText } = render(<HashTool />)
    const binaryFile = new File(['abc'], 'sample.bin', { type: 'application/octet-stream' })
    Object.defineProperty(binaryFile, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode('abc').buffer),
    })

    fireEvent.drop(getByText('选择文件').closest('label')!, {
      dataTransfer: { types: ['Files'], files: [binaryFile], dropEffect: 'none' },
    })
    await waitFor(() => expect(getByText('文件：sample.bin')).toBeTruthy())

    const textFile = new File(['text input'], 'sample.txt', { type: 'text/plain' })
    Object.defineProperty(textFile, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode('text input').buffer),
    })
    fireEvent.drop(getByRole('textbox'), {
      dataTransfer: { types: ['Files'], files: [textFile], dropEffect: 'none' },
    })
    await waitFor(() => expect((getByRole('textbox') as HTMLTextAreaElement).value).toBe('text input'))
    expect(queryByText('文件：sample.bin')).toBeNull()
  })

  it('哈希工具连续拖入文件时保留最后一次结果', async () => {
    let resolveFirst!: (value: ArrayBuffer) => void
    const firstRead = new Promise<ArrayBuffer>((resolve) => { resolveFirst = resolve })
    const first = new File(['first'], 'first.bin')
    const second = new File(['second'], 'second.bin')
    Object.defineProperty(first, 'arrayBuffer', { value: vi.fn(() => firstRead) })
    Object.defineProperty(second, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode('second').buffer),
    })
    const HashTool = TOOLS.find((tool) => tool.id === 'hash')!.component
    const { getByText, queryByText } = render(<HashTool />)
    const dropTarget = getByText('选择文件').closest('label')!

    fireEvent.drop(dropTarget, {
      dataTransfer: { types: ['Files'], files: [first], dropEffect: 'none' },
    })
    fireEvent.drop(dropTarget, {
      dataTransfer: { types: ['Files'], files: [second], dropEffect: 'none' },
    })
    await waitFor(() => expect(getByText('文件：second.bin')).toBeTruthy())

    await act(async () => resolveFirst(new TextEncoder().encode('first').buffer))
    expect(queryByText('文件：first.bin')).toBeNull()
    expect(getByText('文件：second.bin')).toBeTruthy()
  })

  it.each(TOOLS.map((t) => [t.id, t.name, t.component] as const))(
    '渲染 %s (%s) 不应抛错',
    (_id, _name, Component) => {
      expect(() => render(<Component />)).not.toThrow()
    },
  )

  it('注册表工具数量符合预期', () => {
    // 需求覆盖的工具集合，防止后续误删
    expect(TOOLS.length).toBeGreaterThanOrEqual(29)
    const ids = new Set(TOOLS.map((t) => t.id))
    expect(ids.size).toBe(TOOLS.length) // id 无重复
  })

  it('Base 工具可切换制式与字符编码', () => {
    const BaseTool = TOOLS.find((t) => t.id === 'base64')!.component
    const { getAllByRole } = render(<BaseTool />)
    const selects = getAllByRole('combobox') as HTMLSelectElement[]
    const textareas = getAllByRole('textbox') as HTMLTextAreaElement[]

    fireEvent.change(selects[0], { target: { value: 'base32' } })
    fireEvent.change(selects[1], { target: { value: 'utf-16le' } })
    fireEvent.change(textareas[0], { target: { value: '你好' } })

    expect(selects[0].value).toBe('base32')
    expect(selects[1].value).toBe('utf-16le')
    expect(textareas[1].value).toBe('MBHX2WI=')
  })

  it('Base64 图片 Data URI 不显示文本解码错误', () => {
    const BaseTool = TOOLS.find((t) => t.id === 'base64')!.component
    const { getByRole, getAllByRole, getByText, queryByText } = render(<BaseTool />)

    fireEvent.click(getByRole('button', { name: '解码' }))
    fireEvent.change(getAllByRole('textbox')[0], {
      target: { value: 'data:image/gif;base64,R0lGODlh' },
    })

    expect(getByText('图片预览')).toBeTruthy()
    expect(getByText('image/gif')).toBeTruthy()
    expect(queryByText(/Base64 包含非法字符/)).toBeNull()
  })

  it('图片转 Base64 连续拖入时保留最后一次结果', async () => {
    let resolveFirst!: (value: ArrayBuffer) => void
    const firstRead = new Promise<ArrayBuffer>((resolve) => { resolveFirst = resolve })
    const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const first = new File(['first'], 'first.png')
    const second = new File(['second'], 'second.png')
    Object.defineProperty(first, 'arrayBuffer', { value: vi.fn(() => firstRead) })
    Object.defineProperty(second, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(Uint8Array.from([...pngHeader, 2]).buffer),
    })
    const BaseTool = TOOLS.find((tool) => tool.id === 'base64')!.component
    const { getByText, getAllByRole } = render(<BaseTool />)
    const dropTarget = getByText('图片转 Base64').closest('label')!

    fireEvent.drop(dropTarget, {
      dataTransfer: { types: ['Files'], files: [first], dropEffect: 'none' },
    })
    fireEvent.drop(dropTarget, {
      dataTransfer: { types: ['Files'], files: [second], dropEffect: 'none' },
    })
    await waitFor(() => expect(getByText('图片 Data URI')).toBeTruthy())
    const latestValue = (getAllByRole('textbox')[0] as HTMLTextAreaElement).value

    await act(async () => resolveFirst(Uint8Array.from([...pngHeader, 1]).buffer))
    expect((getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toBe(latestValue)
  })

  it('URL 参数解析结果可复制为 JSON', async () => {
    const UrlTool = TOOLS.find((t) => t.id === 'url')!.component
    const { getByRole } = render(<UrlTool />)
    const writeText = vi.mocked(navigator.clipboard.writeText)
    writeText.mockClear()

    fireEvent.click(getByRole('button', { name: '参数解析' }))
    const copyJson = getByRole('button', { name: '复制为 JSON' }) as HTMLButtonElement
    expect(copyJson.disabled).toBe(true)

    fireEvent.change(getByRole('textbox'), {
      target: { value: 'https://example.com/?tag=one&name=devtoolbox&tag=two' },
    })
    fireEvent.click(getByRole('button', { name: '解析' }))
    expect(copyJson.disabled).toBe(false)

    await act(async () => fireEvent.click(copyJson))
    expect(writeText).toHaveBeenCalledWith(
      '{\n  "tag": [\n    "one",\n    "two"\n  ],\n  "name": "devtoolbox"\n}',
    )
  })

  it('独立 URL 参数与 JSON 工具支持双向转换', () => {
    const UrlJsonTool = TOOLS.find((t) => t.id === 'url-json')!.component
    const { getByRole, getAllByRole } = render(<UrlJsonTool />)
    const textareas = getAllByRole('textbox') as HTMLTextAreaElement[]

    fireEvent.change(textareas[0], { target: { value: '?tag=one&tag=two&page=2' } })
    expect(JSON.parse(textareas[1].value)).toEqual({ tag: ['one', 'two'], page: '2' })

    fireEvent.click(getByRole('button', { name: 'JSON → URL 参数' }))
    fireEvent.change(textareas[0], {
      target: { value: '{"tag":["one","two"],"page":2}' },
    })
    expect(textareas[1].value).toBe('tag=one&tag=two&page=2')
  })

  it('URL 参数与 JSON 工具拒绝普通文本输入', () => {
    const UrlJsonTool = TOOLS.find((t) => t.id === 'url-json')!.component
    const { getAllByRole, getByText } = render(<UrlJsonTool />)

    fireEvent.change(getAllByRole('textbox')[0], { target: { value: 'ordinary text' } })

    expect((getAllByRole('textbox')[1] as HTMLTextAreaElement).value).toBe('')
    expect(getByText(/Query String 应包含 key=value 参数/)).toBeTruthy()
  })
})

describe('设置面板', () => {
  it('open=false 时不渲染', () => {
    const { container } = render(<SettingsPanel open={false} onClose={() => {}} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
  it('open=true 时渲染且含处理模式与历史开关', () => {
    const { getByText, getAllByRole } = render(<SettingsPanel open onClose={() => {}} />)
    expect(getByText('处理模式')).toBeTruthy()
    expect(getByText('历史记录')).toBeTruthy()
    expect(getAllByRole('switch')).toHaveLength(1)
  })
  it('切换手动模式后再渲染工具不报错', () => {
    act(() => setSettings({ processMode: 'manual' }))
    const Json = TOOLS.find((t) => t.id === 'json')!.component
    expect(() => render(<Json />)).not.toThrow()
    act(() => setSettings({ processMode: 'auto' })) // 复位
  })
})
