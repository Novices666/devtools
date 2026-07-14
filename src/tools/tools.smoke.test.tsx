import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, act, fireEvent, waitFor } from '@testing-library/react'
import { TOOLS } from '../registry'
import { SettingsPanel } from '../components/SettingsPanel'
import { FileDropInput } from '../components/ui'
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
      dataTransfer: { types: ['Files'], files: [textFile], dropEffect: 'none' },
    })
    expect(onReject).toHaveBeenCalledWith(textFile)
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
    fireEvent.drop(getByRole('textbox'), {
      dataTransfer: { types: ['Files'], files: [textFile], dropEffect: 'none' },
    })
    await waitFor(() => expect((getByRole('textbox') as HTMLTextAreaElement).value).toBe('text input'))
    expect(queryByText('文件：sample.bin')).toBeNull()
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
    // 至少有开关组件（role=switch）
    expect(getAllByRole('switch').length).toBeGreaterThanOrEqual(2)
  })
  it('切换手动模式后再渲染工具不报错', () => {
    act(() => setSettings({ processMode: 'manual' }))
    const Json = TOOLS.find((t) => t.id === 'json')!.component
    expect(() => render(<Json />)).not.toThrow()
    act(() => setSettings({ processMode: 'auto' })) // 复位
  })
})
