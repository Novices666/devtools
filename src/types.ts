// 工具注册与通用类型定义
import type { ComponentType } from 'react'

export type ToolCategory =
  | 'format' // 数据格式
  | 'encoding' // 编解码
  | 'crypto' // 加密哈希
  | 'time' // 时间编号
  | 'text' // 文本处理
  | 'convert' // 转换类
  | 'misc' // 其他

export interface ToolMeta {
  id: string
  name: string // 中文名
  nameEn: string // 英文名
  category: ToolCategory
  keywords: string[] // 搜索关键词/别名
  description: string
  priority: 'P0' | 'P1' | 'P2'
  component: ComponentType
}

export interface CategoryMeta {
  id: ToolCategory
  name: string
  icon: string
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'format', name: '数据格式', icon: '{}' },
  { id: 'encoding', name: '编码解码', icon: '⇄' },
  { id: 'crypto', name: '加密哈希', icon: '🔒' },
  { id: 'time', name: '时间编号', icon: '🕐' },
  { id: 'text', name: '文本处理', icon: 'Aa' },
  { id: 'convert', name: '转换工具', icon: '#' },
  { id: 'misc', name: '其他工具', icon: '✦' },
]
