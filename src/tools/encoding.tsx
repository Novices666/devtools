import { useMemo, useState } from 'react'
import {
  ToolShell,
  TwoPane,
  Panel,
  TextArea,
  Output,
  CopyButton,
  Button,
  Segmented,
  Select,
  ErrorHint,
  Checkbox,
  ProcessControls,
  FileDropInput,
} from '../components/ui'
import { useProcessMode } from '../hooks/useProcessMode'
import {
  textToBase,
  baseToText,
  bytesToBase64,
  detectImageMime,
  base64ToImage,
  BASE_ENCODING_OPTIONS,
  CHARACTER_ENCODING_OPTIONS,
  urlEncode,
  urlDecode,
  parseQueryString,
  parseQueryStringStrict,
  buildQueryString,
  queryParamsToJson,
  jsonToQueryParams,
  escapeHtml,
  unescapeHtml,
  toUnicodeEscape,
  fromUnicodeEscape,
  escapeString,
  unescapeString,
  type BaseEncoding,
  type CharacterEncoding,
  type QueryParam,
} from '../core/encoding'
import {
  parseJwt,
  jwtStatus,
  verifyJwtHmac,
  verifyJwtAsymmetric,
  jwtAlgFamily,
  JWT_CLAIM_DESCRIPTIONS,
  JWT_TIME_CLAIMS,
} from '../core/jwt'
import { describeTimestamp } from '../core/time'
import { useEffect } from 'react'
import { HistoryMenu } from '../components/HistoryMenu'

function runSafe(fn: () => string): { out: string; error?: string } {
  try {
    return { out: fn() }
  } catch (e) {
    return { out: '', error: (e as Error).message }
  }
}

// ---------- Base 编解码 ----------
export function Base64Tool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [base, setBase] = useState<BaseEncoding>('base64')
  const [characterEncoding, setCharacterEncoding] = useState<CharacterEncoding>('utf-8')
  const [imgData, setImgData] = useState('')
  const [imageError, setImageError] = useState<string>()
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { out, error } = useMemo(() => {
    if (committed === '') return { out: '' }
    return runSafe(() =>
      mode === 'encode'
        ? textToBase(committed, base, characterEncoding)
        : baseToText(committed, base, characterEncoding),
    )
  }, [committed, mode, base, characterEncoding])

  const baseLabel = BASE_ENCODING_OPTIONS.find((option) => option.value === base)?.label ?? base
  const characterLabel =
    CHARACTER_ENCODING_OPTIONS.find((option) => option.value === characterEncoding)?.label ?? characterEncoding
  const supportsImageDecode = base === 'base64' || base === 'base64url'

  // 解码方向：识别输入是否为图片，提供预览 + 下载
  const decodedImage = useMemo(() => {
    if (mode !== 'decode' || !supportsImageDecode || !committed.trim()) return null
    const r = base64ToImage(committed)
    return r.isImage ? r : null
  }, [committed, mode, supportsImageDecode])
  const imgExt = decodedImage?.mime
    ? decodedImage.mime.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg')
    : 'png'

  async function onImageFile(file: File) {
    setImageError(undefined)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const mime = file.type || detectImageMime(bytes)
      if (!mime?.startsWith('image/')) throw new Error('无法识别图片格式')
      setImgData(`data:${mime};base64,${bytesToBase64(bytes)}`)
    } catch (reason) {
      setImgData('')
      setImageError(`图片读取失败: ${(reason as Error).message}`)
    }
  }

  return (
    <ToolShell title="Base 编解码" description="常用 Base 制式互转，可指定文本字符编码">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '编码', value: 'encode' },
            { label: '解码', value: 'decode' },
          ]}
        />
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          Base 制式
          <Select
            value={base}
            onChange={(value) => {
              setBase(value)
              setImgData('')
              setImageError(undefined)
            }}
            options={BASE_ENCODING_OPTIONS}
          />
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          字符编码
          <Select
            value={characterEncoding}
            onChange={setCharacterEncoding}
            options={CHARACTER_ENCODING_OPTIONS}
          />
        </label>
        <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
        {base === 'base64' && (
          <FileDropInput
            accept="image/*"
            onFile={onImageFile}
            onReject={() => setImageError('请选择图片文件')}
            title="点击或拖入图片"
            className="cursor-pointer rounded-md bg-slate-200/70 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-600/60"
          >
            图片转 Base64
          </FileDropInput>
        )}
        <Button className="ml-auto" variant="danger" onClick={() => { setInput(''); setImgData(''); setImageError(undefined) }}>
          清空
        </Button>
      </div>
      <ErrorHint message={imageError} />
      {imgData ? (
        <TwoPane
          left={
            <Panel title="图片 Data URI" actions={<CopyButton text={imgData} />}>
              <Output value={imgData} />
            </Panel>
          }
          right={
            <Panel title="图片预览">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-slate-100 p-3 dark:bg-slate-900/50">
                <img src={imgData} alt="预览" className="max-h-full max-w-full object-contain" />
              </div>
            </Panel>
          }
        />
      ) : (
        <TwoPane
          left={
            <Panel title={mode === 'encode' ? `文本输入 (${characterLabel})` : `${baseLabel} 输入`}>
              <TextArea value={input} onChange={(e) => setInput(e.target.value)} onFileText={(t) => setInput(t)} placeholder={mode === 'encode' ? '输入待编码文本' : `输入 ${baseLabel}`} />
              <ErrorHint message={decodedImage ? undefined : error} />
            </Panel>
          }
          right={
            <Panel
              title={decodedImage ? '图片预览' : mode === 'encode' ? `${baseLabel} 输出` : `文本输出 (${characterLabel})`}
              actions={
                decodedImage ? (
                  <a href={decodedImage.dataUri} download={`decoded.${imgExt}`}>
                    <Button variant="primary">下载图片</Button>
                  </a>
                ) : (
                  <CopyButton text={out} />
                )
              }
            >
              {decodedImage ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto rounded-md bg-slate-100 p-3 dark:bg-slate-900/50">
                  <img src={decodedImage.dataUri} alt="解码图片" className="max-h-full max-w-full object-contain" />
                  <span className="text-xs text-slate-500">{decodedImage.mime}</span>
                </div>
              ) : (
                <Output value={out} />
              )}
            </Panel>
          }
        />
      )}
    </ToolShell>
  )
}

// ---------- URL ----------
export function UrlTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode' | 'parse'>('encode')
  const [component, setComponent] = useState(true)
  const [params, setParams] = useState<QueryParam[]>([])

  const { out, error } = useMemo(() => {
    if (mode === 'parse') return { out: '' }
    if (!input.trim()) return { out: '' }
    return runSafe(() => (mode === 'encode' ? urlEncode(input, component) : urlDecode(input, component)))
  }, [input, mode, component])

  function doParse() {
    setParams(parseQueryString(input))
  }
  const rebuilt = useMemo(() => buildQueryString(params), [params])
  const paramsJson = useMemo(
    () => (params.some((param) => param.key !== '') ? queryParamsToJson(params) : ''),
    [params],
  )

  return (
    <ToolShell title="URL 编解码" description="URL 编码 / 解码、query string 参数解析与重组">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '编码', value: 'encode' },
            { label: '解码', value: 'decode' },
            { label: '参数解析', value: 'parse' },
          ]}
        />
        {mode !== 'parse' && (
          <Segmented
            value={component ? 'comp' : 'uri'}
            onChange={(v) => setComponent(v === 'comp')}
            options={[
              { label: 'Component', value: 'comp' },
              { label: 'URI', value: 'uri' },
            ]}
          />
        )}
        {mode === 'parse' && <Button variant="primary" onClick={doParse}>解析</Button>}
        <Button className="ml-auto" variant="danger" onClick={() => { setInput(''); setParams([]) }}>
          清空
        </Button>
      </div>
      {mode === 'parse' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Panel title="URL / Query String 输入" className="flex-none">
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 URL 或 query string，如 a=1&b=hello%20world" className="min-h-[80px]" />
          </Panel>
          <Panel
            title="参数表格（可编辑）"
            actions={
              <>
                <CopyButton text={paramsJson} label="复制为 JSON" />
                <CopyButton text={rebuilt} label="复制重组结果" />
              </>
            }
            className="flex-1"
          >
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="pb-2 pr-2">键</th>
                    <th className="pb-2 pr-2">值</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => (
                    <tr key={i}>
                      <td className="py-0.5 pr-2">
                        <input value={p.key} onChange={(e) => setParams((ps) => ps.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800" />
                      </td>
                      <td className="py-0.5 pr-2">
                        <input value={p.value} onChange={(e) => setParams((ps) => ps.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800" />
                      </td>
                      <td className="py-0.5">
                        <button onClick={() => setParams((ps) => ps.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-600">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button className="mt-2" onClick={() => setParams((ps) => [...ps, { key: '', value: '' }])}>+ 添加参数</Button>
              {rebuilt && <div className="mt-3 break-all rounded-md bg-slate-100 p-2 font-mono text-xs dark:bg-slate-900/50">{rebuilt}</div>}
            </div>
          </Panel>
        </div>
      ) : (
        <TwoPane
          left={
            <Panel title="输入" actions={<HistoryMenu toolId="url" value={input} onRestore={setInput} />}>
              <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入文本" />
              <ErrorHint message={error} />
            </Panel>
          }
          right={
            <Panel title="输出" actions={<CopyButton text={out} />}>
              <Output value={out} />
            </Panel>
          }
        />
      )}
    </ToolShell>
  )
}

// ---------- URL 参数 ↔ JSON ----------
export function UrlJsonTool() {
  const [input, setInput] = useState('')
  const [direction, setDirection] = useState<'queryToJson' | 'jsonToQuery'>('queryToJson')
  const { committed, commit, manual, dirty } = useProcessMode(input)
  const { out, error } = useMemo(() => {
    if (committed.trim() === '') return { out: '' }
    return runSafe(() =>
      direction === 'queryToJson'
        ? queryParamsToJson(parseQueryStringStrict(committed))
        : buildQueryString(jsonToQueryParams(committed)),
    )
  }, [committed, direction])

  const queryToJson = direction === 'queryToJson'

  return (
    <ToolShell title="URL 参数 ↔ JSON" description="URL 查询参数与 JSON 对象双向转换">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { label: 'URL 参数 → JSON', value: 'queryToJson' },
            { label: 'JSON → URL 参数', value: 'jsonToQuery' },
          ]}
        />
        <ProcessControls manual={manual} dirty={dirty} onRun={commit} />
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>
          清空
        </Button>
      </div>
      <TwoPane
        left={
          <Panel
            title={queryToJson ? 'URL / Query String 输入' : 'JSON 输入'}
            actions={<HistoryMenu toolId="url-json" value={input} onRestore={setInput} />}
          >
            <TextArea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFileText={(text) => setInput(text)}
              placeholder={
                queryToJson
                  ? '输入完整 URL 或参数，如 ?page=1&tag=js&tag=ts'
                  : '输入 JSON 对象，如 {"page":1,"tag":["js","ts"]}'
              }
            />
            <ErrorHint message={error} />
          </Panel>
        }
        right={
          <Panel
            title={queryToJson ? 'JSON 输出' : 'URL 参数输出'}
            actions={<CopyButton text={out} />}
          >
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- HTML 实体 ----------
export function HtmlEntityTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'escape' | 'unescape'>('escape')
  const out = useMemo(() => {
    if (!input) return ''
    return mode === 'escape' ? escapeHtml(input) : unescapeHtml(input)
  }, [input, mode])
  return (
    <ToolShell title="HTML 实体" description="HTML 特殊字符转义 / 反转义">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={mode} onChange={setMode} options={[{ label: '转义', value: 'escape' }, { label: '反转义', value: 'unescape' }]} />
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>清空</Button>
      </div>
      <TwoPane
        left={<Panel title="输入" actions={<HistoryMenu toolId="html-entity" value={input} onRestore={setInput} />}><TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入文本或 HTML" /></Panel>}
        right={<Panel title="输出" actions={<CopyButton text={out} />}><Output value={out} /></Panel>}
      />
    </ToolShell>
  )
}

// ---------- Unicode / 转义 ----------
export function UnicodeTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'toU' | 'fromU' | 'esc' | 'unesc'>('toU')
  const [allChars, setAllChars] = useState(false)
  const out = useMemo(() => {
    if (!input) return ''
    switch (mode) {
      case 'toU': return toUnicodeEscape(input, allChars)
      case 'fromU': return fromUnicodeEscape(input)
      case 'esc': return escapeString(input)
      case 'unesc': return unescapeString(input)
    }
  }, [input, mode, allChars])
  return (
    <ToolShell title="Unicode / 转义" description="中文 ↔ \uXXXX、转义序列处理">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '转 Unicode', value: 'toU' },
            { label: 'Unicode 转字符', value: 'fromU' },
            { label: '转义', value: 'esc' },
            { label: '反转义', value: 'unesc' },
          ]}
        />
        {mode === 'toU' && <Checkbox checked={allChars} onChange={setAllChars} label="全部字符（含 ASCII）" />}
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>清空</Button>
      </div>
      <TwoPane
        left={<Panel title="输入" actions={<HistoryMenu toolId="unicode" value={input} onRestore={setInput} />}><TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入文本" /></Panel>}
        right={<Panel title="输出" actions={<CopyButton text={out} />}><Output value={out} /></Panel>}
      />
    </ToolShell>
  )
}

// ---------- JWT ----------
export function JwtTool() {
  const [input, setInput] = useState('')
  const [secret, setSecret] = useState('')
  const [verify, setVerify] = useState<{ valid: boolean; error?: string } | null>(null)
  const parsed = useMemo(() => {
    if (!input.trim()) return null
    try {
      return { data: parseJwt(input), error: undefined as string | undefined }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  }, [input])

  const status = useMemo(() => (parsed?.data ? jwtStatus(parsed.data.payload) : null), [parsed])
  const alg = parsed?.data ? String(parsed.data.header.alg || '') : ''
  const family = alg ? jwtAlgFamily(alg) : 'unknown'
  const isAsymmetric = family === 'RSA' || family === 'RSA-PSS' || family === 'EC'

  // 校验签名：HMAC 同步；RS/PS/ES 异步（WebCrypto）
  useEffect(() => {
    let cancelled = false
    if (!parsed?.data || !secret.trim()) {
      setVerify(null)
      return
    }
    if (isAsymmetric) {
      verifyJwtAsymmetric(input, secret)
        .then((valid) => !cancelled && setVerify({ valid }))
        .catch((e) => !cancelled && setVerify({ valid: false, error: (e as Error).message }))
    } else {
      try {
        setVerify({ valid: verifyJwtHmac(input, secret) })
      } catch (e) {
        setVerify({ valid: false, error: (e as Error).message })
      }
    }
    return () => {
      cancelled = true
    }
  }, [input, secret, parsed, isAsymmetric])

  function renderClaims(obj: Record<string, unknown>) {
    return (
      <div className="space-y-1 font-mono text-xs">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex flex-wrap gap-2">
            <span className="text-sky-600 dark:text-sky-400">{k}</span>
            <span className="text-slate-700 dark:text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            {JWT_TIME_CLAIMS.includes(k as never) && typeof v === 'number' && (
              <span className="text-slate-400">({describeTimestamp(new Date(v * 1000)).local})</span>
            )}
            {JWT_CLAIM_DESCRIPTIONS[k] && <span className="text-slate-400">— {JWT_CLAIM_DESCRIPTIONS[k]}</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <ToolShell title="JWT 解析" description="解析 Header / Payload / Signature，校验 HMAC(HS) 与非对称(RS/PS/ES) 签名">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="danger" onClick={() => { setInput(''); setSecret('') }}>清空</Button>
        {alg && (
          <span className="rounded-md bg-slate-200/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            算法 {alg}
            {family === 'unknown' && ' (未识别)'}
            {family === 'none' && ' (无签名)'}
          </span>
        )}
        {verify && (
          <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${verify.valid ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
            {verify.error ? verify.error : verify.valid ? '✓ 签名有效' : '✗ 签名无效'}
          </span>
        )}
      </div>
      {isAsymmetric ? (
        <textarea
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          spellCheck={false}
          placeholder={'粘贴 SPKI/PEM 公钥校验签名（可选）\n-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'}
          className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          rows={4}
        />
      ) : (
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="密钥（校验 HMAC 签名，可选）"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      )}
      <TwoPane
        left={
          <Panel title="JWT 输入">
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 JWT (xxx.yyy.zzz)" />
            <ErrorHint message={parsed?.error} />
          </Panel>
        }
        right={
          <Panel title="解析结果">
            <div className="min-h-0 flex-1 space-y-3 overflow-auto">
              {parsed?.data && (
                <>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-500">HEADER</div>
                    {renderClaims(parsed.data.header)}
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-500">PAYLOAD</div>
                    {renderClaims(parsed.data.payload)}
                  </div>
                  {status && (status.expired !== null || status.notYetValid !== null) && (
                    <div className="rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900/50">
                      {status.expired === true && <div className="text-red-500">⚠ 令牌已过期</div>}
                      {status.expired === false && <div className="text-green-500">✓ 令牌未过期</div>}
                      {status.notYetValid === true && <div className="text-amber-500">⚠ 令牌尚未生效 (nbf)</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        }
      />
    </ToolShell>
  )
}
