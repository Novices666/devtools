import { useEffect, useRef, useState, type ReactNode } from 'react'
import { saveGeneratedFile } from '../core/generatedFile'
import { Button } from './ui'

interface GeneratedFileButtonProps {
  dataUrl: string
  fileName: string
  filterName: string
  extensions: string[]
  children: ReactNode
  variant?: 'primary' | 'ghost'
  onError?: (message?: string) => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'cancelled' | 'downloaded'

const STATUS_LABEL: Record<Exclude<SaveStatus, 'idle' | 'saving'>, string> = {
  saved: '✓ 已保存',
  cancelled: '已取消',
  downloaded: '✓ 已下载',
}

/** 保存/下载生成文件；桌面端区分已保存、已取消，Web 端显示已下载。 */
export function GeneratedFileButton({
  dataUrl,
  fileName,
  filterName,
  extensions,
  children,
  variant = 'primary',
  onError,
}: GeneratedFileButtonProps) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const flashStatus = (next: Exclude<SaveStatus, 'idle' | 'saving'>) => {
    setStatus(next)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus('idle'), 1500)
  }

  const handleSave = async () => {
    if (status === 'saving') return
    setStatus('saving')
    onError?.(undefined)
    try {
      const result = await saveGeneratedFile({ dataUrl, fileName, filterName, extensions })
      if (result === 'saved') flashStatus('saved')
      else if (result === 'cancelled') flashStatus('cancelled')
      else flashStatus('downloaded')
    } catch (reason) {
      setStatus('idle')
      onError?.(`保存失败：${(reason as Error).message}`)
    }
  }

  const label =
    status === 'saving'
      ? '保存中…'
      : status === 'idle'
        ? children
        : STATUS_LABEL[status]

  return (
    <Button variant={variant} onClick={handleSave} disabled={status === 'saving'}>
      {label}
    </Button>
  )
}
