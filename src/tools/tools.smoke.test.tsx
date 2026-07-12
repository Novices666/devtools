import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import { TOOLS } from '../registry'
import { SettingsPanel } from '../components/SettingsPanel'
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
