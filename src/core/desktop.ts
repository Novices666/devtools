// 桌面端（Tauri）集成桥接层。
//
// 设计原则：
// 通过 `window.__TAURI_INTERNALS__` 探测运行时，使 Web 与桌面端共享同一套界面。

import { detectContent } from './detect'
import { inferImageMime } from './files'

/** 是否运行在 Tauri 桌面容器内 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 平台标识：desktop / web */
export function platform(): 'desktop' | 'web' {
  return isDesktop() ? 'desktop' : 'web'
}

/** 可直接消费图片文件的工具（窗口拖放图片时优先停留在当前工具） */
const IMAGE_CAPABLE_TOOLS = new Set(['image', 'qrcode', 'base64', 'hash'])

/** 判断是否为图片文件（MIME 或扩展名） */
export function isImageFile(file: Pick<File, 'name' | 'type'>): boolean {
  return inferImageMime(file) !== null
}

/**
 * 窗口拖入图片时的目标工具：
 * 若当前工具本身能处理图片则保持，否则跳转到「图片工具」。
 */
export function resolveImageOpenTool(currentToolId: string): string {
  return IMAGE_CAPABLE_TOOLS.has(currentToolId) ? currentToolId : 'image'
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

/** 可被「按内容打开」路由到的工具。不含 hash/id：二者是生成/计算工具，不是内容检视。 */
const OPEN_FILE_TOOLS = new Set([
  'base64',
  'color',
  'cron',
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
