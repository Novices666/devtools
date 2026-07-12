// 转换类：进制转换、颜色转换

// ---------- 进制转换 ----------
export type Radix = 2 | 8 | 10 | 16

export interface RadixResult {
  valid: boolean
  error?: string
  bin: string
  oct: string
  dec: string
  hex: string
}

export function convertRadix(value: string, from: Radix): RadixResult {
  const trimmed = value.trim()
  if (trimmed === '') {
    return { valid: true, bin: '', oct: '', dec: '', hex: '' }
  }
  // 去除常见前缀
  const cleaned = trimmed.replace(/^0[xXbBoO]/, '')
  const pattern: Record<Radix, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^-?\d+$/,
    16: /^[0-9a-fA-F]+$/,
  }
  if (!pattern[from].test(cleaned)) {
    return {
      valid: false,
      error: `不是合法的 ${from} 进制数`,
      bin: '',
      oct: '',
      dec: '',
      hex: '',
    }
  }
  let n: bigint
  try {
    if (from === 10) {
      n = BigInt(cleaned)
    } else {
      const prefix = from === 2 ? '0b' : from === 8 ? '0o' : '0x'
      n = BigInt(prefix + cleaned)
    }
  } catch (e) {
    return {
      valid: false,
      error: (e as Error).message,
      bin: '',
      oct: '',
      dec: '',
      hex: '',
    }
  }
  const neg = n < 0n
  const abs = neg ? -n : n
  const sign = neg ? '-' : ''
  return {
    valid: true,
    bin: sign + abs.toString(2),
    oct: sign + abs.toString(8),
    dec: n.toString(10),
    hex: sign + abs.toString(16).toUpperCase(),
  }
}

// ---------- 颜色转换 ----------
export interface RGB {
  r: number
  g: number
  b: number
  a: number // 0..1
}
export interface HSL {
  h: number
  s: number
  l: number
  a: number
}
export interface HSV {
  h: number
  s: number
  v: number
  a: number
}

export function parseColor(input: string): RGB | null {
  const s = input.trim().toLowerCase()
  if (s === '') return null
  // HEX
  const hex = s.replace(/^#/, '')
  if (/^([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) {
    return hexToRgb(hex)
  }
  // rgb / rgba
  const rgbMatch = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  )
  if (rgbMatch) {
    return {
      r: clampByte(+rgbMatch[1]),
      g: clampByte(+rgbMatch[2]),
      b: clampByte(+rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? clamp01(+rgbMatch[4]) : 1,
    }
  }
  // hsl / hsla
  const hslMatch = s.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/,
  )
  if (hslMatch) {
    return hslToRgb({
      h: +hslMatch[1],
      s: +hslMatch[2],
      l: +hslMatch[3],
      a: hslMatch[4] !== undefined ? clamp01(+hslMatch[4]) : 1,
    })
  }
  return null
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace(/^#/, '')
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

export function rgbToHex(rgb: RGB, withAlpha = false): string {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  const base = `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`
  if (withAlpha && rgb.a < 1) {
    return base + to(Math.round(rgb.a * 255))
  }
  return base
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgb.a,
  }
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsl.a,
  }
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
    a: rgb.a,
  }
}

export function formatRgb(rgb: RGB): string {
  return rgb.a < 1
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${round(rgb.a, 2)})`
    : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}
export function formatHsl(hsl: HSL): string {
  return hsl.a < 1
    ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${round(hsl.a, 2)})`
    : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}
export function formatHsv(hsv: HSV): string {
  return `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`
}

function round(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
