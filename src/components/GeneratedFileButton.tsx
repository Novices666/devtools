import { useState, type ReactNode } from 'react'
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

export function GeneratedFileButton({
  dataUrl,
  fileName,
  filterName,
  extensions,
  children,
  variant = 'primary',
  onError,
}: GeneratedFileButtonProps) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    onError?.(undefined)
    try {
      await saveGeneratedFile({ dataUrl, fileName, filterName, extensions })
    } catch (reason) {
      onError?.(`保存失败：${(reason as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Button variant={variant} onClick={handleSave} disabled={saving}>
      {saving ? '保存中…' : children}
    </Button>
  )
}
