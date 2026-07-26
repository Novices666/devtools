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

export function JsonTool() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<IndentStyle>(2)
  const [recursive, setRecursive] = useState(true)
  const [jsonPath, setJsonPath] = useState('')
  const [mode, setMode] = useState<'format' | 'query'>('format')
  const [view, setView] = useState<'text' | 'tree'>('text')
  const [treeFilter, setTreeFilter] = useState('')
  const { committed, commit, manual, dirty } = useProcessMode(input)

  // 状态徽章与错误提示始终反映「当前输入」，避免手动模式下显示过期的合法/错误
  const inputValidation = useMemo((): JsonValidateResult | null => {
    if (!input.trim()) return null
    return validateJson(input)
  }, [input])

  // 大文本（5MB+ JSON）时，把校验/格式化/解析统一放到异步路径，避免每次按键
  // 同步阻塞主线程（需求 §6.1）；常规数据仍走同步快路径，零延迟。
  const { result, pending, large } = useAsyncProcess(
    committed,
    (text): { validation: JsonValidateResult; output: string; parsed?: unknown } => {
      if (!text.trim()) return { validation: { valid: true }, output: '' }
      const validation = validateJson(text)
      if (!validation.valid) return { validation, output: '' }
      // 已确认合法：解析一次，格式化与树视图复用同一结果，避免重复 parse
      const doc = JSON.parse(text)
      if (mode === 'query') {
        const matches = queryJsonPath(text, jsonPath)
        // JSONPath 恒返回节点列表（数组）。命中单个节点（含空路径/$ 即整个文档）时
        // 展开显示该节点本身，避免多包一层 [...]，与格式化模式保持一致；
        // 多个或零个命中才保留数组形态。
        const queried = matches.length === 1 ? matches[0] : matches
        return { validation, output: JSON.stringify(queried, null, 2), parsed: queried }
      }
      return { validation, output: formatJson(text, indent), parsed: doc }
    },
    [indent, mode, jsonPath],
  )

  const output = result?.output ?? ''
  // 树视图数据：基于已提交结果，与输出面板一致
  const treeData = view === 'tree' && result?.validation?.valid ? result?.parsed : undefined

  const errorMsg =
    inputValidation && !inputValidation.valid
      ? `第 ${inputValidation.line ?? '?'} 行 第 ${inputValidation.column ?? '?'} 列：${inputValidation.error}`
      : undefined

  /** 更新输入；在手动模式下可选立即提交（示例/美化等明确意图的操作） */
  const setInputAndMaybeCommit = (next: string, shouldCommit: boolean) => {
    setInput(next)
    if (shouldCommit) commit(next)
  }

  const applyTransform = (fn: (value: string) => string) => {
    try {
      const next = fn(input)
      setInputAndMaybeCommit(next, true)
    } catch {
      /* 保持原输入 */
    }
  }

  return (
    <ToolShell title="JSON 工具" description="格式化、压缩、校验、排序键、JSONPath 查询、转义">
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
          <Button onClick={() => applyTransform((v) => formatJson(v, indent))}>美化</Button>
          <Button onClick={() => applyTransform((v) => minifyJson(v))}>压缩</Button>
          <Button onClick={() => applyTransform((v) => sortJsonKeys(v, recursive, indent))}>排序键</Button>
          <Button onClick={() => applyTransform((v) => escapeJsonString(v))}>转义</Button>
          <Button onClick={() => applyTransform((v) => unescapeJsonString(v))}>反转义</Button>
          <Button variant="danger" onClick={() => setInputAndMaybeCommit('', true)}>清空</Button>
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
        <div className="flex items-center gap-3">
          <Checkbox checked={recursive} onChange={setRecursive} label="排序键递归" />
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
                    {committed.trim() ? '无法解析' : dirty ? '有未执行的输入' : '暂无内容'}
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
