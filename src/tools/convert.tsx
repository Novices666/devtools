import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ToolShell,
  Panel,
  CopyButton,
  Button,
  TextInput,
  ErrorHint,
  FileDropInput,
} from '../components/ui'
import {
  convertRadix,
  parseColor,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  formatRgb,
  formatHsl,
  formatHsv,
  hslToRgb,
  type Radix,
} from '../core/convert'
import { inferImageMime } from '../core/files'
import { GeneratedFileButton } from '../components/GeneratedFileButton'
import { useLatestOperation } from '../hooks/useLatestOperation'

// ---------------- 进制转换 ----------------
export function RadixTool() {
  const [values, setValues] = useState({ bin: '', oct: '', dec: '', hex: '' })
  const [error, setError] = useState<string>()

  const update = (raw: string, from: Radix) => {
    const key = from === 2 ? 'bin' : from === 8 ? 'oct' : from === 10 ? 'dec' : 'hex'
    if (raw.trim() === '') {
      setValues({ bin: '', oct: '', dec: '', hex: '' })
      setError(undefined)
      return
    }
    const r = convertRadix(raw, from)
    if (!r.valid) {
      setValues((p) => ({ ...p, [key]: raw }))
      setError(r.error)
      return
    }
    setError(undefined)
    setValues({ bin: r.bin, oct: r.oct, dec: r.dec, hex: r.hex })
  }

  const rows: Array<{ label: string; key: keyof typeof values; radix: Radix }> = [
    { label: '二进制 (2)', key: 'bin', radix: 2 },
    { label: '八进制 (8)', key: 'oct', radix: 8 },
    { label: '十进制 (10)', key: 'dec', radix: 10 },
    { label: '十六进制 (16)', key: 'hex', radix: 16 },
  ]

  return (
    <ToolShell title="进制转换" description="2 / 8 / 10 / 16 进制实时互转（支持大整数 BigInt）">
      <Panel>
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-sm text-slate-500">{row.label}</label>
              <input
                value={values[row.key]}
                onChange={(e) => update(e.target.value, row.radix)}
                placeholder={`输入${row.label}`}
                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <CopyButton text={values[row.key]} />
            </div>
          ))}
        </div>
        <ErrorHint message={error} />
        <div className="mt-3">
          <Button variant="danger" onClick={() => { setValues({ bin: '', oct: '', dec: '', hex: '' }); setError(undefined) }}>
            清空
          </Button>
        </div>
      </Panel>
    </ToolShell>
  )
}

// ---------------- 颜色转换 ----------------
export function ColorTool() {
  const [input, setInput] = useState('#0ea5e9')
  const rgb = useMemo(() => parseColor(input), [input])

  const derived = useMemo(() => {
    if (!rgb) return null
    return {
      hex: rgbToHex(rgb, rgb.a < 1),
      rgb: formatRgb(rgb),
      hsl: formatHsl(rgbToHsl(rgb)),
      hsv: formatHsv(rgbToHsv(rgb)),
    }
  }, [rgb])

  const hsl = rgb ? rgbToHsl(rgb) : null

  return (
    <ToolShell title="颜色转换" description="HEX ↔ RGB ↔ HSL ↔ HSV 互转，含选择器与预览">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={rgb ? rgbToHex(rgb) : '#000000'}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-md border border-slate-200 bg-transparent dark:border-slate-700"
        />
        <TextInput value={input} onChange={setInput} acceptOpenedFile placeholder="#RRGGBB / rgb() / hsl()" className="min-w-[220px] flex-1 font-mono" />
      </div>
      <ErrorHint message={rgb ? undefined : input.trim() ? '无法解析该颜色值' : undefined} />
      {derived && rgb && (
        <>
          <div
            className="h-24 rounded-lg border border-slate-200 dark:border-slate-700"
            style={{ backgroundColor: derived.rgb }}
          />
          <Panel>
            <div className="flex flex-col gap-2">
              {(['hex', 'rgb', 'hsl', 'hsv'] as const).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <label className="w-16 shrink-0 text-sm uppercase text-slate-500">{k}</label>
                  <input
                    readOnly
                    value={derived[k]}
                    className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                  <CopyButton text={derived[k]} />
                </div>
              ))}
            </div>
          </Panel>
          {hsl && (
            <Panel title="色相微调">
              <input
                type="range"
                min={0}
                max={360}
                value={hsl.h}
                onChange={(e) => {
                  const next = hslToRgb({ ...hsl, h: Number(e.target.value) })
                  setInput(rgbToHex(next))
                }}
                className="w-full"
              />
            </Panel>
          )}
        </>
      )}
    </ToolShell>
  )
}

// ---------------- 二维码 ----------------
export function QrCodeTool() {
  const [text, setText] = useState('https://')
  const [dataUrl, setDataUrl] = useState('')
  const [svgUrl, setSvgUrl] = useState('')
  const [decoded, setDecoded] = useState<string>()
  const [error, setError] = useState<string>()
  const [decodeError, setDecodeError] = useState<string>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { begin: beginDecode, cancel: cancelDecode } = useLatestOperation()

  useEffect(() => {
    let cancelled = false
    if (!text) {
      setDataUrl('')
      setSvgUrl('')
      return
    }
    import('qrcode')
      .then(async (QR) => {
        const [png, svg] = await Promise.all([
          QR.toDataURL(text, { width: 320, margin: 2, errorCorrectionLevel: 'M' }),
          QR.toString(text, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }),
        ])
        if (!cancelled) {
          setDataUrl(png)
          setSvgUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
          setError(undefined)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [text])

  const onDecodeFile = (file: File) => {
    const isLatest = beginDecode()
    setDecoded(undefined)
    setDecodeError(undefined)
    const reader = new FileReader()
    reader.onload = () => {
      if (!isLatest()) return
      const img = new Image()
      img.onload = async () => {
        if (!isLatest()) return
        try {
          const canvas = canvasRef.current
          if (!canvas) throw new Error('二维码画布不可用')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('无法读取图片像素')
          ctx.drawImage(img, 0, 0)
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const jsQR = (await import('jsqr')).default
          if (!isLatest()) return
          const result = jsQR(imgData.data, imgData.width, imgData.height)
          if (result) {
            setDecoded(result.data)
            setDecodeError(undefined)
          } else {
            setDecodeError('未能识别二维码')
          }
        } catch (reason) {
          if (isLatest()) setDecodeError((reason as Error).message)
        }
      }
      img.onerror = () => {
        if (isLatest()) setDecodeError('图片解码失败')
      }
      const mime = inferImageMime(file)
      img.src = mime
        ? String(reader.result).replace(/^data:[^;,]*/, `data:${mime}`)
        : String(reader.result)
    }
    reader.onerror = () => {
      if (isLatest()) setDecodeError('图片读取失败')
    }
    reader.onabort = () => {
      if (isLatest()) setDecodeError('图片读取已取消')
    }
    reader.readAsDataURL(file)
  }

  return (
    <ToolShell title="二维码" description="文本 / URL 生成二维码（可下载），或上传图片解析">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="生成">
          <TextInput value={text} onChange={setText} placeholder="输入文本或 URL" className="mb-3" />
          <ErrorHint message={error && !decoded ? error : undefined} />
          <div className="flex flex-col items-center gap-3">
            {dataUrl && <img src={dataUrl} alt="二维码" className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700" width={220} height={220} />}
            {dataUrl && (
              <div className="flex gap-2">
                <GeneratedFileButton
                  dataUrl={dataUrl}
                  fileName="qrcode.png"
                  filterName="PNG 图片"
                  extensions={['png']}
                  onError={setError}
                >
                  下载 PNG
                </GeneratedFileButton>
                {svgUrl && (
                  <GeneratedFileButton
                    dataUrl={svgUrl}
                    fileName="qrcode.svg"
                    filterName="SVG 图片"
                    extensions={['svg']}
                    variant="ghost"
                    onError={setError}
                  >
                    下载 SVG
                  </GeneratedFileButton>
                )}
              </div>
            )}
          </div>
        </Panel>
        <Panel title="解析">
          <FileDropInput
            accept="image/*"
            onFile={onDecodeFile}
            onReject={() => {
              cancelDecode()
              setDecoded(undefined)
              setDecodeError('请选择图片文件')
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 p-8 text-sm text-slate-500 transition-colors hover:border-sky-400 dark:border-slate-600"
          >
            <span>点击或拖拽二维码图片</span>
          </FileDropInput>
          <ErrorHint message={decodeError} />
          <canvas ref={canvasRef} className="hidden" />
          {decoded && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-slate-500">识别结果</span>
                <CopyButton text={decoded} />
              </div>
              <div className="break-all rounded-md bg-slate-100 p-3 font-mono text-sm dark:bg-slate-900/50">{decoded}</div>
            </div>
          )}
        </Panel>
      </div>
    </ToolShell>
  )
}
