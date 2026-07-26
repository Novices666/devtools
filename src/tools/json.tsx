import { useMemo, useState } from 'react'
import { ToolShell, TwoPane, Panel, TextArea, Output, CopyButton, Button, Segmented, ErrorHint, Checkbox, Select, TextInput, ProcessControls, ProcessingHint } from '../components/ui'
import { JsonTree } from '../components/JsonTree'
import { HistoryMenu } from '../components/HistoryMenu'
import { useProcessMode } from '../hooks/useProcessMode'
import { useAsyncProcess } from '../hooks/useAsyncProcess'
import {
  formatJson,
  minifyJson,
  validateJson,
  sortJsonKeys,
  queryJsonPath,
  escapeJsonString,
  unescapeJsonString,
  type IndentStyle,
  type JsonValidateResult,
} from '../core/json'

const SAMPLE = '{\n  "name": "DevToolbox",\n  "version": 1.1,\n  "tags": ["json", "offline"],\n  "nested": { "a": 1, "b": [true, null] }\n}'

/** 输出侧变换：只影响右侧结果，不改写输入 */
type OutputTransform = 'pretty' | 'minify' | 'sort' | 'escape' | 'unescape'

export function JsonTool() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<IndentStyle>(2)
  const [recursive, setRecursive] = useState(true)
  const [jsonPath, setJsonPath] = useState('')
  const [mode, setMode] = useState<'format' | 'query'>('format')
  const [transform, setTransform] = useState<OutputTransform>('pretty')
  const [view, setView] = useState<'text' | 'tree'>('text')
  const [treeFilter, setTreeFilter] = useState('')
  const { committed, commit, manual, dirty } = useProcessMode(input)

  // 状态徽章与错误提示始终反映「当前输入」，避免手动模式下显示过期的合法/错误
  const inputValidation = useMemo((): JsonValidateResult | null => {
    if (!input.trim()) return null
    // 转义/反转义面向任意文本，不按 JSON 合法性打标
    if (mode === 'format' && (transform === 'escape' || transform === 'unescape')) {
      return { valid: true }
    }
    return validateJson(input)
  }, [input, mode, transform])

  // 大文本（5MB+ JSON）时，把校验/格式化/解析统一放到异步路径，避免每次按键
  // 同步阻塞主线程（需求 §6.1）；常规数据仍走同步快路径，零延迟。
  const { result, pending, large } = useAsyncProcess(
    committed,
    (text): { validation: JsonValidateResult; output: string; parsed?: unknown } => {
      if (!text.trim()) return { validation: { valid: true }, output: '' }

      if (mode === 'query') {
        const validation = validateJson(text)
        if (!validation.valid) return { validation, output: '' }
        const matches = queryJsonPath(text, jsonPath)
        // JSONPath 恒返回节点列表（数组）。命中单个节点（含空路径/$ 即整个文档）时
        // 展开显示该节点本身，避免多包一层 [...]，与格式化模式保持一致；
        // 多个或零个命中才保留数组形态。
        const queried = matches.length === 1 ? matches[0] : matches
        return { validation, output: JSON.stringify(queried, null, 2), parsed: queried }
      }

      // 格式化模式：按当前输出变换生成右侧结果，输入保持不变
      try {
        switch (transform) {
          case 'escape':
            return { validation: { valid: true }, output: escapeJsonString(text) }
          case 'unescape':
            return { validation: { valid: true }, output: unescapeJsonString(text) }
          case 'minify': {
            const validation = validateJson(text)
            if (!validation.valid) return { validation, output: '' }
            const doc = JSON.parse(text)
            return { validation, output: minifyJson(text), parsed: doc }
          }
          case 'sort': {
            const validation = validateJson(text)
            if (!validation.valid) return { validation, output: '' }
            const doc = JSON.parse(text)
            return { validation, output: sortJsonKeys(text, recursive, indent), parsed: doc }
          }
          case 'pretty':
          default: {
            const validation = validateJson(text)
            if (!validation.valid) return { validation, output: '' }
            const doc = JSON.parse(text)
            return { validation, output: formatJson(text, indent), parsed: doc }
          }
        }
      } catch (e) {
        return {
          validation: { valid: false, error: (e as Error).message },
          output: '',
        }
      }
    },
    [indent, mode, jsonPath, transform, recursive],
  )

  const output = result?.output ?? ''
  // 树视图仅对可解析为 JSON 结构的变换有意义
  const treeEligible =
    mode === 'query' || transform === 'pretty' || transform === 'minify' || transform === 'sort'
  const treeData =
    view === 'tree' && treeEligible && result?.validation?.valid ? result?.parsed : undefined

  const errorMsg =
    inputValidation && !inputValidation.valid
      ? `第 ${inputValidation.line ?? '?'} 行 第 ${inputValidation.column ?? '?'} 列：${inputValidation.error}`
      : result && !result.validation.valid && committed.trim()
        ? result.validation.error
          ? String(result.validation.error)
          : '处理失败'
        : undefined

  /** 更新输入；在手动模式下可选立即提交 */
  const setInputAndMaybeCommit = (next: string, shouldCommit: boolean) => {
    setInput(next)
    if (shouldCommit) commit(next)
  }

  /** 切换输出变换：只改右侧结果，并提交当前输入以便手动模式立即出结果 */
  const applyOutputTransform = (next: OutputTransform) => {
    setMode('format')
    setTransform(next)
    if (view === 'tree' && (next === 'escape' || next === 'unescape')) {
      setView('text')
    }
    commit()
  }

  const transformLabel: Record<OutputTransform, string> = {
    pretty: '美化',
    minify: '压缩',
    sort: '排序键',
    escape: '转义',
    unescape: '反转义',
  }

  return (
    <ToolShell title="JSON 工具" description="格式化、压缩、校验、排序键、JSONPath 查询、转义（结果在输出区）">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { label: '格式化', value: 'format' },
            { label: 'JSONPath 查询', value: 'query' },
          ]}
        />
        {mode === 'format' && (
          <Select
            value={String(indent) as '2' | '4' | 'tab'}
            onChange={(v) => setIndent(v === 'tab' ? 'tab' : (Number(v) as IndentStyle))}
            options={[
              { label: '缩进 2 空格', value: '2' },
              { label: '缩进 4 空格', value: '4' },
              { label: '缩进 Tab', value: 'tab' },
            ]}
          />
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <ProcessControls manual={manual} dirty={dirty} onRun={() => commit()} />
          <Button onClick={() => setInputAndMaybeCommit(SAMPLE, true)}>示例</Button>
          <Button
            variant={mode === 'format' && transform === 'pretty' ? 'primary' : 'ghost'}
            onClick={() => applyOutputTransform('pretty')}
          >
            美化
          </Button>
          <Button
            variant={mode === 'format' && transform === 'minify' ? 'primary' : 'ghost'}
            onClick={() => applyOutputTransform('minify')}
          >
            压缩
          </Button>
          <Button
            variant={mode === 'format' && transform === 'sort' ? 'primary' : 'ghost'}
            onClick={() => applyOutputTransform('sort')}
          >
            排序键
          </Button>
          <Button
            variant={mode === 'format' && transform === 'escape' ? 'primary' : 'ghost'}
            onClick={() => applyOutputTransform('escape')}
          >
            转义
          </Button>
          <Button
            variant={mode === 'format' && transform === 'unescape' ? 'primary' : 'ghost'}
            onClick={() => applyOutputTransform('unescape')}
          >
            反转义
          </Button>
          <Button variant="danger" onClick={() => setInputAndMaybeCommit('', true)}>
            清空
          </Button>
        </div>
      </div>
      {mode === 'query' && (
        <div className="flex items-center gap-2">
          <input
            value={jsonPath}
            onChange={(e) => setJsonPath(e.target.value)}
            placeholder="JSONPath（留空 = 根节点/整个 JSON）：$.a.b、$.tags[0]、$..key、$[*]、$.items[?(@.p>10)]"
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      )}
      {mode === 'format' && (
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox checked={recursive} onChange={setRecursive} label="排序键递归" />
          <span className="text-xs text-slate-400">
            当前输出：{transformLabel[transform]}（结果仅显示在右侧，不覆盖输入）
          </span>
        </div>
      )}
      <TwoPane
        left={
          <Panel
            title="输入"
            actions={
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${
                    !inputValidation
                      ? 'text-slate-400'
                      : inputValidation.valid
                        ? 'text-green-500'
                        : 'text-red-500'
                  }`}
                >
                  {!inputValidation
                    ? ''
                    : inputValidation.valid
                      ? dirty
                        ? '✓ 合法（未执行）'
                        : '✓ 合法'
                      : '✗ 错误'}
                </span>
                <HistoryMenu
                  toolId="json"
                  value={input}
                  onRestore={(v) => setInputAndMaybeCommit(v, true)}
                />
              </div>
            }
          >
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFileText={(t) => setInputAndMaybeCommit(t, true)}
              placeholder="粘贴 JSON，或拖入 .json 文件"
            />
            <ErrorHint message={errorMsg} />
          </Panel>
        }
        right={
          <Panel
            title="输出"
            actions={
              <div className="flex items-center gap-1.5">
                <ProcessingHint pending={pending} large={large} />
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { label: '文本', value: 'text' },
                    { label: '树视图', value: 'tree' },
                  ]}
                />
                <CopyButton text={output} />
              </div>
            }
          >
            {view === 'tree' ? (
              <>
                <div className="mb-2">
                  <TextInput
                    value={treeFilter}
                    onChange={setTreeFilter}
                    placeholder="搜索键或值（高亮）"
                    className="w-full"
                  />
                </div>
                {treeData === undefined ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                    {!treeEligible
                      ? '当前变换无树视图'
                      : committed.trim()
                        ? '无法解析'
                        : dirty
                          ? '有未执行的输入'
                          : '暂无内容'}
                  </div>
                ) : (
                  <JsonTree data={treeData} filter={treeFilter} />
                )}
              </>
            ) : (
              <Output value={output} />
            )}
          </Panel>
        }
      />
    </ToolShell>
  )
}
