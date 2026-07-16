// 桌面端（Tauri）集成桥接层。
//
// 设计原则：
// - 纯 Web 环境下所有导出均为安全 no-op，绝不因缺少 Tauri 运行时而报错。
// - 通过 `window.__TAURI_INTERNALS__` 探测运行时，并按需加载 @tauri-apps API，
//   保持 Web 环境不执行任何桌面调用。
// - 桌面专属能力（文件关联打开、系统剪贴板监听、托盘）由 Rust 侧发事件，
//   前端在此订阅并转成回调。

import { detectContent } from './detect'

/** 是否运行在 Tauri 桌面容器内 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 平台标识：desktop / web */
export function platform(): 'desktop' | 'web' {
  return isDesktop() ? 'desktop' : 'web'
}

export interface OpenFilePayload {
  path: string
  content: string
}

const FILE_EXTENSION_TO_TOOL: Record<string, string> = {
  csv: 'csv',
  diff: 'diff',
  json: 'json',
  markdown: 'markdown',
  md: 'markdown',
  sql: 'sql',
  toml: 'toml',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
}

const OPEN_FILE_TOOLS = new Set([
  'base64',
  'color',
  'cron',
  'hash',
  'json',
  'sql',
  'subnet',
  'timestamp',
  'url',
  'user-agent',
  'xml',
  'jwt',
])

/** 根据扩展名和内容选择可接收文件内容的工具。 */
export function resolveOpenFileTool(path: string, content: string): string {
  const extension = path.toLowerCase().match(/\.([^.\\/]+)$/)?.[1]
  if (extension && FILE_EXTENSION_TO_TOOL[extension]) return FILE_EXTENSION_TO_TOOL[extension]
  const detected = detectContent(content).find((result) => OPEN_FILE_TOOLS.has(result.toolId))
  return detected?.toolId ?? 'text-transform'
}

/**
 * 订阅桌面端"打开文件"事件（双击关联文件或通过系统“打开方式”进入）。
 * Rust 侧以 `open-file` 事件发送 { path, content }。
 * 订阅完成后读取冷启动期间暂存的文件，避免前端尚未加载时丢失事件。
 * 返回取消订阅函数；Web 端返回 no-op。
 */
export function onOpenFile(handler: (payload: OpenFilePayload) => void): () => void {
  if (!isDesktop()) return () => {}
  let cancelled = false
  let dispose: (() => void) | null = null
  void (async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen<OpenFilePayload>('open-file', (event) => handler(event.payload))
      if (cancelled) {
        unlisten()
        return
      }
      dispose = unlisten
      const { invoke } = await import('@tauri-apps/api/core')
      const pending = await invoke<OpenFilePayload[]>('take_pending_open_files')
      if (!cancelled) pending.forEach(handler)
    } catch {
      /* 桌面桥接初始化失败时保持 Web 功能可用 */
    }
  })()
  return () => {
    cancelled = true
    dispose?.()
  }
}

/**
 * 订阅系统剪贴板变化（桌面端由 Rust 侧轮询/监听后推送）。
 * Rust 侧以 `clipboard-changed` 事件发送剪贴板文本。
 */
export function onClipboardChanged(handler: (text: string) => void): () => void {
  if (!isDesktop()) return () => {}
  let cancelled = false
  let dispose: (() => void) | null = null
  void import('@tauri-apps/api/event')
    .then(({ listen }) => listen<string>('clipboard-changed', (event) => handler(String(event.payload ?? ''))))
    .then((unlisten) => {
      if (cancelled) unlisten()
      else dispose = unlisten
    })
    .catch(() => {})
  return () => {
    cancelled = true
    dispose?.()
  }
}
