// 中文繁简转换（基于 OpenCC，本地完成）
import OpenCC from 'opencc-js'

/** 转换方向：简→繁 / 繁→简 */
export type ChineseConvertDirection = 's2t' | 't2s'

/**
 * 繁体变体：
 * - tw: 台湾正体（字形）
 * - twp: 台湾正体 + 惯用词（如 软件→軟體、信息→資訊）
 * - hk: 香港繁体
 */
export type ChineseVariant = 'tw' | 'twp' | 'hk'

export type ChineseLocale = 'cn' | ChineseVariant

export const CHINESE_VARIANT_OPTIONS: Array<{ value: ChineseVariant; label: string; hint: string }> = [
  { value: 'tw', label: '台湾', hint: '台湾正体字形' },
  { value: 'twp', label: '台湾（惯用词）', hint: '台湾正体 + 词汇本地化' },
  { value: 'hk', label: '香港', hint: '香港繁体字形' },
]

export const CHINESE_DIRECTION_OPTIONS: Array<{
  value: ChineseConvertDirection
  label: string
}> = [
  { value: 's2t', label: '简体 → 繁体' },
  { value: 't2s', label: '繁体 → 简体' },
]

type ConverterFn = (text: string) => string

const converterCache = new Map<string, ConverterFn>()

function getConverter(from: ChineseLocale, to: ChineseLocale): ConverterFn {
  const key = `${from}->${to}`
  let converter = converterCache.get(key)
  if (!converter) {
    converter = OpenCC.Converter({ from, to })
    converterCache.set(key, converter)
  }
  return converter
}

/** 解析方向与变体对应的 OpenCC from/to */
export function resolveChineseLocales(
  direction: ChineseConvertDirection,
  variant: ChineseVariant = 'tw',
): { from: ChineseLocale; to: ChineseLocale } {
  if (direction === 's2t') return { from: 'cn', to: variant }
  return { from: variant, to: 'cn' }
}

/**
 * 中文繁简转换。
 * 空字符串直接返回；非中文字符与标点保持原样。
 */
export function convertChinese(
  text: string,
  direction: ChineseConvertDirection,
  variant: ChineseVariant = 'tw',
): string {
  if (text === '') return ''
  const { from, to } = resolveChineseLocales(direction, variant)
  return getConverter(from, to)(text)
}
