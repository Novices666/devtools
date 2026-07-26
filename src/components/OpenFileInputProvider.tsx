import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'

export interface OpenedTextFile {
  id: number
  toolId: string
  path: string
  content: string
}

export interface OpenedBinaryFile {
  id: number
  toolId: string
  file: File
}

interface OpenFileInputContextValue {
  claimText: () => OpenedTextFile | null
  claimBinary: () => OpenedBinaryFile | null
}

const OpenFileInputContext = createContext<OpenFileInputContextValue | null>(null)

/** 当前工具面板是否为前台（keep-alive 后台面板不得 claim 打开的文件） */
const ToolPaneActiveContext = createContext(true)

export function ToolPaneActiveProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return <ToolPaneActiveContext.Provider value={active}>{children}</ToolPaneActiveContext.Provider>
}

export function useToolPaneActive(): boolean {
  return useContext(ToolPaneActiveContext)
}

export function OpenFileInputProvider({
  file,
  binaryFile,
  children,
}: {
  file: OpenedTextFile | null
  binaryFile?: OpenedBinaryFile | null
  children: ReactNode
}) {
  const claimedTextIdRef = useRef<number>()
  const claimedBinaryIdRef = useRef<number>()
  const value = useMemo<OpenFileInputContextValue>(
    () => ({
      claimText: () => {
        if (!file || claimedTextIdRef.current === file.id) return null
        claimedTextIdRef.current = file.id
        return file
      },
      claimBinary: () => {
        if (!binaryFile || claimedBinaryIdRef.current === binaryFile.id) return null
        claimedBinaryIdRef.current = binaryFile.id
        return binaryFile
      },
    }),
    [file, binaryFile],
  )

  return <OpenFileInputContext.Provider value={value}>{children}</OpenFileInputContext.Provider>
}

export function useOpenedFileInput(
  enabled: boolean,
  onOpen: (file: OpenedTextFile) => void,
): void {
  const context = useContext(OpenFileInputContext)
  const paneActive = useToolPaneActive()
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (!enabled || !paneActive) return
    const opened = context?.claimText()
    if (opened) onOpenRef.current(opened)
  }, [context, enabled, paneActive])
}

/** 接收窗口级拖入的图片/二进制文件（按 toolId 路由后注入） */
export function useOpenedBinaryFile(
  enabled: boolean,
  onOpen: (file: File) => void,
): void {
  const context = useContext(OpenFileInputContext)
  const paneActive = useToolPaneActive()
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (!enabled || !paneActive) return
    const opened = context?.claimBinary()
    if (opened) onOpenRef.current(opened.file)
  }, [context, enabled, paneActive])
}
