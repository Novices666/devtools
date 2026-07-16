import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'

export interface OpenedTextFile {
  id: number
  toolId: string
  path: string
  content: string
}

interface OpenFileInputContextValue {
  claim: () => OpenedTextFile | null
}

const OpenFileInputContext = createContext<OpenFileInputContextValue | null>(null)

export function OpenFileInputProvider({
  file,
  children,
}: {
  file: OpenedTextFile | null
  children: ReactNode
}) {
  const claimedIdRef = useRef<number>()
  const value = useMemo<OpenFileInputContextValue>(
    () => ({
      claim: () => {
        if (!file || claimedIdRef.current === file.id) return null
        claimedIdRef.current = file.id
        return file
      },
    }),
    [file],
  )

  return <OpenFileInputContext.Provider value={value}>{children}</OpenFileInputContext.Provider>
}

export function useOpenedFileInput(
  enabled: boolean,
  onOpen: (file: OpenedTextFile) => void,
): void {
  const context = useContext(OpenFileInputContext)
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    if (!enabled) return
    const file = context?.claim()
    if (file) onOpenRef.current(file)
  }, [context, enabled])
}
