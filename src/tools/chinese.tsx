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
} from '../components/ui'
import { HistoryMenu } from '../components/HistoryMenu'
import {
  convertChinese,
  CHINESE_DIRECTION_OPTIONS,
  CHINESE_VARIANT_OPTIONS,
  type ChineseConvertDirection,
  type ChineseVariant,
} from '../core/chinese'

/** 中文繁简转换 */
export function ChineseConvertTool() {
  const [input, setInput] = useState('')
  const [direction, setDirection] = useState<ChineseConvertDirection>('s2t')
  const [variant, setVariant] = useState<ChineseVariant>('tw')

  const out = useMemo(
    () => (input ? convertChinese(input, direction, variant) : ''),
    [input, direction, variant],
  )

  const variantHint = CHINESE_VARIANT_OPTIONS.find((o) => o.value === variant)?.hint

  return (
    <ToolShell
      title="繁简转换"
      description="中文简体与繁体互转，支持台湾 / 香港字形及台湾惯用词，全部在本地完成"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={direction}
          onChange={setDirection}
          options={CHINESE_DIRECTION_OPTIONS}
        />
        <Segmented
          value={variant}
          onChange={setVariant}
          options={CHINESE_VARIANT_OPTIONS.map(({ value, label }) => ({ value, label }))}
        />
        {variantHint && (
          <span className="text-xs text-slate-400">{variantHint}</span>
        )}
        <Button className="ml-auto" variant="danger" onClick={() => setInput('')}>
          清空
        </Button>
      </div>
      <TwoPane
        left={
          <Panel
            title="输入"
            actions={
              <HistoryMenu toolId="chinese-convert" value={input} onRestore={setInput} />
            }
          >
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFileText={(t) => setInput(t)}
              placeholder={
                direction === 's2t'
                  ? '输入简体中文，可拖入文件'
                  : '输入繁体中文，可拖入文件'
              }
            />
          </Panel>
        }
        right={
          <Panel title="输出" actions={<CopyButton text={out} />}>
            <Output value={out} />
          </Panel>
        }
      />
    </ToolShell>
  )
}
