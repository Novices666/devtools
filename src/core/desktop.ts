// 桌面端（Tauri）集成桥接层。
//
// 设计原则：
// 通过 `window.__TAURI_INTERNALS__` 探测运行时，使 Web 与桌面端共享同一套界面。

import { detectContent } from './detect'

/** 是否运行在 Tauri 桌面容器内 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 平台标识：desktop / web */
export function platform(): 'desktop' | 'web' {
  return isDesktop() ? 'desktop' : 'web'
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
