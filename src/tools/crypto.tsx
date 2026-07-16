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
  ErrorHint,
  Checkbox,
  Select,
  TextInput,
  FileDropInput,
} from '../components/ui'
import { hashAll, hashArrayBuffer, hmac, HASH_ALGOS, type HashAlgo, type HmacOutput } from '../core/hash'
import { aesEncrypt, aesDecrypt, generatePassword, generateToken, type AesMode, type AesPadding, type KeyFormat, type PasswordOptions } from '../core/crypto'
import { generateRsaKeyPair, rsaEncrypt, rsaDecrypt } from '../core/rsa'
import bcrypt from 'bcryptjs'
import { useLatestOperation } from '../hooks/useLatestOperation'

// ---------- 哈希 ----------
export function HashTool() {
  const [input, setInput] = useState('')
  const [upper, setUpper] = useState(false)
  const [fileHash, setFileHash] = useState<Record<HashAlgo, string> | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState<string>()
  const { begin: beginFileHash, cancel: cancelFileHash } = useLatestOperation()

  const hashes = useMemo(() => (input ? hashAll(input) : null), [input])
  const shown = fileHash ?? hashes

  async function onFile(file: File) {
    const isLatest = beginFileHash()
    setFileError(undefined)
    try {
      const buf = await file.arrayBuffer()
      const result = {} as Record<HashAlgo, string>
      for (const algo of HASH_ALGOS) result[algo] = hashArrayBuffer(buf, algo)
      if (!isLatest()) return
      setFileHash(result)
      setFileName(file.name)
    } catch (reason) {
      if (isLatest()) setFileError(`文件读取失败: ${(reason as Error).message}`)
    }
  }

  const handleTextInput = (text: string) => {
    cancelFileHash()
    setInput(text)
    setFileHash(null)
    setFileName('')
    setFileError(undefined)
  }

  const fmt = (s: string) => (upper ? s.toUpperCase() : s)

  return (
    <ToolShell title="哈希计算" description="MD5 / SHA1 / SHA256 / SHA384 / SHA512，支持文本与文件">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox checked={upper} onChange={setUpper} label="大写输出" />
        <FileDropInput
          onFile={onFile}
          title="点击选择文件，或拖入文件按原始字节计算"
          className="cursor-pointer rounded-md bg-slate-200/70 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-600/60"
        >
          选择文件
        </FileDropInput>
        {fileName && <span className="text-xs text-slate-500">文件：{fileName}</span>}
        <Button className="ml-auto" variant="danger" onClick={() => { cancelFileHash(); setInput(''); setFileHash(null); setFileName(''); setFileError(undefined) }}>清空</Button>
      </div>
      <ErrorHint message={fileError} />
      <Panel title="哈希结果" className="flex-none">
        <div className="space-y-2">
          {shown &&
            HASH_ALGOS.map((algo) => (
              <div key={algo} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">{algo}</span>
                <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-900/50">{fmt(shown[algo])}</code>
                <CopyButton text={fmt(shown[algo])} />
              </div>
            ))}
        </div>
      </Panel>
      <Panel title="输入文本" className="min-h-0 flex-1">
        <TextArea value={input} onChange={(e) => handleTextInput(e.target.value)} onFileText={(t) => handleTextInput(t)} placeholder="输入文本进行哈希" className="min-h-[120px]" />
      </Panel>
    </ToolShell>
  )
}

// ---------- HMAC ----------
export function HmacTool() {
  const [input, setInput] = useState('')
  const [key, setKey] = useState('')
  const [algo, setAlgo] = useState<HashAlgo>('SHA256')
  const [output, setOutput] = useState<HmacOutput>('hex')
  const out = useMemo(() => {
    if (!input || !key) return ''
    try {
      return hmac(input, key, algo, output)
    } catch {
      return ''
    }
  }, [input, key, algo, output])
  return (
    <ToolShell title="HMAC" description="基于密钥的哈希消息认证码">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={algo} onChange={setAlgo} options={HASH_ALGOS.map((a) => ({ label: a, value: a }))} />
        <Segmented value={output} onChange={setOutput} options={[{ label: 'Hex', value: 'hex' }, { label: 'Base64', value: 'base64' }]} />
        <Button className="ml-auto" variant="danger" onClick={() => { setInput(''); setKey('') }}>清空</Button>
      </div>
      <TextInput value={key} onChange={setKey} placeholder="密钥" className="w-full" />
      <TwoPane
        left={<Panel title="输入"><TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息" /></Panel>}
        right={<Panel title="HMAC 结果" actions={<CopyButton text={out} />}><Output value={out} /></Panel>}
      />
    </ToolShell>
  )
}

// ---------- AES ----------
export function AesTool() {
  const [input, setInput] = useState('')
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [mode, setMode] = useState<AesMode>('CBC')
  const [padding, setPadding] = useState<AesPadding>('Pkcs7')
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('Utf8')
  const [op, setOp] = useState<'encrypt' | 'decrypt'>('encrypt')

  const { out, error } = useMemo(() => {
    if (!input || !key) return { out: '', error: undefined as string | undefined }
    try {
      const opts = { mode, padding, keyFormat, iv }
      return { out: op === 'encrypt' ? aesEncrypt(input, key, opts) : aesDecrypt(input, key, opts), error: undefined }
    } catch (e) {
      return { out: '', error: (e as Error).message }
    }
  }, [input, key, iv, mode, padding, keyFormat, op])

  return (
    <ToolShell title="AES 加解密" description="可配置模式 / 填充 / 密钥格式 / IV">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={op} onChange={setOp} options={[{ label: '加密', value: 'encrypt' }, { label: '解密', value: 'decrypt' }]} />
        <Select value={mode} onChange={setMode} options={(['CBC', 'ECB', 'CFB', 'OFB', 'CTR'] as AesMode[]).map((m) => ({ label: m, value: m }))} />
        <Select value={padding} onChange={setPadding} options={(['Pkcs7', 'NoPadding', 'ZeroPadding', 'Iso10126'] as AesPadding[]).map((p) => ({ label: p, value: p }))} />
        <Select value={keyFormat} onChange={setKeyFormat} options={(['Utf8', 'Hex', 'Base64'] as KeyFormat[]).map((k) => ({ label: '密钥:' + k, value: k }))} />
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>清空</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <TextInput value={key} onChange={setKey} placeholder="密钥 Key" className="flex-1" />
        {mode !== 'ECB' && <TextInput value={iv} onChange={setIv} placeholder="IV（Hex，16 字节 = 32 hex 字符）" className="flex-1" />}
      </div>
      <TwoPane
        left={
          <Panel title={op === 'encrypt' ? '明文' : '密文 (Base64)'}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder={op === 'encrypt' ? '输入明文' : '输入 Base64 密文'} />
            <ErrorHint message={error} />
          </Panel>
        }
        right={<Panel title={op === 'encrypt' ? '密文 (Base64)' : '明文'} actions={<CopyButton text={out} />}><Output value={out} /></Panel>}
      />
    </ToolShell>
  )
}

// ---------- bcrypt ----------
export function BcryptTool() {
  const [plain, setPlain] = useState('')
  const [rounds, setRounds] = useState(10)
  const [hashOut, setHashOut] = useState('')
  const [verifyHash, setVerifyHash] = useState('')
  const [verifyPlain, setVerifyPlain] = useState('')
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  async function doHash() {
    if (!plain) return
    setBusy(true)
    try {
      const salt = await bcrypt.genSalt(rounds)
      setHashOut(await bcrypt.hash(plain, salt))
    } finally {
      setBusy(false)
    }
  }
  async function doVerify() {
    if (!verifyPlain || !verifyHash) return
    try {
      setVerifyResult(await bcrypt.compare(verifyPlain, verifyHash))
    } catch {
      setVerifyResult(false)
    }
  }

  return (
    <ToolShell title="bcrypt" description="生成 bcrypt 哈希、校验明文与哈希是否匹配">
      <TwoPane
        left={
          <Panel title="生成哈希">
            <div className="space-y-2">
              <TextInput value={plain} onChange={setPlain} placeholder="明文密码" className="w-full" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">强度 (rounds)</span>
                <input type="range" min={4} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="flex-1" />
                <span className="w-8 text-sm">{rounds}</span>
              </div>
              <Button variant="primary" onClick={doHash} disabled={busy}>{busy ? '计算中…' : '生成'}</Button>
              {hashOut && (
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-900/50">{hashOut}</code>
                  <CopyButton text={hashOut} />
                </div>
              )}
            </div>
          </Panel>
        }
        right={
          <Panel title="校验">
            <div className="space-y-2">
              <TextInput value={verifyPlain} onChange={setVerifyPlain} placeholder="明文" className="w-full" />
              <TextInput value={verifyHash} onChange={setVerifyHash} placeholder="bcrypt 哈希" className="w-full" />
              <Button variant="primary" onClick={doVerify}>校验</Button>
              {verifyResult !== null && (
                <div className={`rounded-md px-3 py-2 text-sm font-medium ${verifyResult ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
                  {verifyResult ? '✓ 匹配' : '✗ 不匹配'}
                </div>
              )}
            </div>
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- 随机密码 / Token ----------
export function PasswordTool() {
  const [opts, setOpts] = useState<PasswordOptions>({
    length: 16,
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: false,
    excludeAmbiguous: true,
  })
  const [password, setPassword] = useState('')
  const [tokenBytes, setTokenBytes] = useState(32)
  const [tokenFmt, setTokenFmt] = useState<'hex' | 'base64'>('hex')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  function gen() {
    try {
      setPassword(generatePassword(opts))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolShell title="随机密码 / Token" description="使用加密安全随机数生成密码与令牌">
      <TwoPane
        left={
          <Panel title="随机密码" actions={password ? <CopyButton text={password} /> : undefined}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">长度</span>
                <input type="range" min={4} max={64} value={opts.length} onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })} className="flex-1" />
                <span className="w-8 text-sm">{opts.length}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Checkbox checked={opts.lowercase} onChange={(v) => setOpts({ ...opts, lowercase: v })} label="小写 a-z" />
                <Checkbox checked={opts.uppercase} onChange={(v) => setOpts({ ...opts, uppercase: v })} label="大写 A-Z" />
                <Checkbox checked={opts.numbers} onChange={(v) => setOpts({ ...opts, numbers: v })} label="数字 0-9" />
                <Checkbox checked={opts.symbols} onChange={(v) => setOpts({ ...opts, symbols: v })} label="符号" />
                <Checkbox checked={opts.excludeAmbiguous} onChange={(v) => setOpts({ ...opts, excludeAmbiguous: v })} label="排除易混字符" />
              </div>
              <Button variant="primary" onClick={gen}>生成密码</Button>
              <ErrorHint message={error} />
              {password && <div className="break-all rounded-md bg-slate-100 p-3 font-mono text-sm dark:bg-slate-900/50">{password}</div>}
            </div>
          </Panel>
        }
        right={
          <Panel title="随机 Token" actions={token ? <CopyButton text={token} /> : undefined}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">字节数</span>
                <input type="range" min={8} max={64} value={tokenBytes} onChange={(e) => setTokenBytes(Number(e.target.value))} className="flex-1" />
                <span className="w-8 text-sm">{tokenBytes}</span>
              </div>
              <Segmented value={tokenFmt} onChange={setTokenFmt} options={[{ label: 'Hex', value: 'hex' }, { label: 'Base64', value: 'base64' }]} />
              <Button variant="primary" onClick={() => setToken(generateToken(tokenBytes, tokenFmt))}>生成 Token</Button>
              {token && <div className="break-all rounded-md bg-slate-100 p-3 font-mono text-sm dark:bg-slate-900/50">{token}</div>}
            </div>
          </Panel>
        }
      />
    </ToolShell>
  )
}

// ---------- RSA ----------
export function RsaTool() {
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [modulus, setModulus] = useState('2048')
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string>()

  const genKeys = async () => {
    setGenerating(true)
    setError(undefined)
    try {
      const pair = await generateRsaKeyPair(Number(modulus))
      setPublicKey(pair.publicKey)
      setPrivateKey(pair.privateKey)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const run = async () => {
    setError(undefined)
    setOutput('')
    if (!input.trim()) return
    try {
      if (mode === 'encrypt') {
        if (!publicKey.trim()) throw new Error('请提供公钥')
        setOutput(await rsaEncrypt(publicKey, input))
      } else {
        if (!privateKey.trim()) throw new Error('请提供私钥')
        setOutput(await rsaDecrypt(privateKey, input))
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <ToolShell title="RSA 加解密" description="RSA-OAEP（SHA-256）加解密与密钥对生成，全本地 WebCrypto">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
          密钥长度
          <Select
            value={modulus}
            onChange={setModulus}
            options={[
              { label: '2048 位', value: '2048' },
              { label: '3072 位', value: '3072' },
              { label: '4096 位', value: '4096' },
            ]}
          />
        </label>
        <Button variant="primary" onClick={genKeys} disabled={generating}>
          {generating ? '生成中…' : '生成密钥对'}
        </Button>
        <Button className="ml-auto" variant="danger" onClick={() => { setPublicKey(''); setPrivateKey(''); setInput(''); setOutput('') }}>清空</Button>
      </div>
      <TwoPane
        left={
          <Panel title="公钥 (PEM)" actions={<CopyButton text={publicKey} />}>
            <TextArea value={publicKey} onChange={(e) => setPublicKey(e.target.value)} onFileText={(t) => setPublicKey(t)} placeholder="-----BEGIN PUBLIC KEY-----" className="min-h-[120px] text-xs" />
          </Panel>
        }
        right={
          <Panel title="私钥 (PEM)" actions={<CopyButton text={privateKey} />}>
            <TextArea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} onFileText={(t) => setPrivateKey(t)} placeholder="-----BEGIN PRIVATE KEY-----" className="min-h-[120px] text-xs" />
          </Panel>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '公钥加密', value: 'encrypt' },
            { label: '私钥解密', value: 'decrypt' },
          ]}
        />
        <Button variant="primary" onClick={run}>{mode === 'encrypt' ? '加密' : '解密'}</Button>
      </div>
      <ErrorHint message={error} />
      <TwoPane
        left={
          <Panel title={mode === 'encrypt' ? '明文' : '密文 (Base64)'}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'encrypt' ? '输入待加密文本' : '输入 Base64 密文'} />
          </Panel>
        }
        right={
          <Panel title={mode === 'encrypt' ? '密文 (Base64)' : '明文'} actions={<CopyButton text={output} />}>
            <Output value={output} />
          </Panel>
        }
      />
    </ToolShell>
  )
}
