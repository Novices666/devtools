// 桌面端（Tauri）集成桥接层。
//
// 设计原则：
// - 纯 Web 环境下所有导出均为安全 no-op，绝不因缺少 Tauri 运行时而报错。
// - 通过 `window.__TAURI_INTERNALS__` 探测运行时，避免静态 import @tauri-apps/*
//   造成 Web 构建强依赖（保持一套前端双端运行）。
// - 桌面专属能力（文件关联打开、全局快捷键唤起、托盘）由 Rust 侧发事件，
//   前端在此订阅并转成回调。

/** 是否运行在 Tauri 桌面容器内 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 平台标识：desktop / web */
export function platform(): 'desktop' | 'web' {
  return isDesktop() ? 'desktop' : 'web'
}

// Tauri 的事件 API 通过全局注入，运行时动态取用，避免 Web 端打包报错。
interface TauriEventApi {
  listen: (event: string, handler: (e: { payload: unknown }) => void) => Promise<() => void>
  emit: (event: string, payload?: unknown) => Promise<void>
}

function eventApi(): TauriEventApi | null {
  if (!isDesktop()) return null
  // @ts-expect-error 运行时注入
  const api = window.__TAURI__?.event
  return api ?? null
}

/**
 * 订阅桌面端"打开文件"事件（双击 .json/.txt 等关联文件，或拖入窗口）。
 * Rust 侧以 `open-file` 事件发送 { path, content }。
 * 返回取消订阅函数；Web 端返回 no-op。
 */
export function onOpenFile(handler: (payload: { path: string; content: string }) => void): () => void {
  const api = eventApi()
  if (!api) return () => {}
  let dispose: (() => void) | null = null
  api
    .listen('open-file', (e) => handler(e.payload as { path: string; content: string }))
    .then((d) => {
      dispose = d
    })
    .catch(() => {})
  return () => dispose?.()
}

/**
 * 订阅全局快捷键唤起主窗口 / 聚焦搜索事件。
 * Rust 侧注册全局快捷键（默认 CmdOrCtrl+Shift+Space）后以 `global-activate` 发送。
 */
export function onGlobalActivate(handler: () => void): () => void {
  const api = eventApi()
  if (!api) return () => {}
  let dispose: (() => void) | null = null
  api
    .listen('global-activate', () => handler())
    .then((d) => {
      dispose = d
    })
    .catch(() => {})
  return () => dispose?.()
}

/**
 * 订阅系统剪贴板变化（桌面端由 Rust 侧轮询/监听后推送）。
 * Rust 侧以 `clipboard-changed` 事件发送剪贴板文本。
 */
export function onClipboardChanged(handler: (text: string) => void): () => void {
  const api = eventApi()
  if (!api) return () => {}
  let dispose: (() => void) | null = null
  api
    .listen('clipboard-changed', (e) => handler(String(e.payload ?? '')))
    .then((d) => {
      dispose = d
    })
    .catch(() => {})
  return () => dispose?.()
}
