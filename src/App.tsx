import { useEffect, useMemo, useRef, useState, useCallback, type DragEvent } from 'react'
import {
  TOOLS,
  TOOL_MAP,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  searchTools,
  type ToolMeta,
} from './registry'
import { useTheme, type Theme } from './hooks/useTheme'
import { useLocalStorage } from './hooks/useLocalStorage'
import { SettingsPanel } from './components/SettingsPanel'
import { isDesktop, onOpenFile, resolveOpenFileTool } from './core/desktop'
import { readTextFile } from './core/files'
import { useLatestOperation } from './hooks/useLatestOperation'
import {
  OpenFileInputProvider,
  type OpenedTextFile,
} from './components/OpenFileInputProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faToolbox,
  faBars,
  faXmark,
  faStar as faStarSolid,
  faGear,
  faSun,
  faMoon,
  faDesktop,
} from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const order: Theme[] = ['light', 'dark', 'system']
  const icon: Record<Theme, typeof faSun> = { light: faSun, dark: faMoon, system: faDesktop }
  const label: Record<Theme, string> = { light: '明亮', dark: '暗黑', system: '跟随系统' }
  const next = () => setTheme(order[(order.indexOf(theme) + 1) % order.length])
  return (
    <button
      type="button"
      onClick={next}
      title={`主题：${label[theme]}（点击切换）`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
    >
      <FontAwesomeIcon icon={icon[theme]} />
    </button>
  )
}

function ToolIcon({ tool }: { tool: ToolMeta }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
      {tool.icon}
    </span>
  )
}

export function App() {
  const [currentId, setCurrentId] = useLocalStorage<string>('devtoolbox:current', 'json')
  const [favorites, setFavorites] = useLocalStorage<string[]>('devtoolbox:favorites', [])
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openedFile, setOpenedFile] = useState<OpenedTextFile | null>(null)
  const [openFileError, setOpenFileError] = useState<string>()
  const searchRef = useRef<HTMLInputElement>(null)
  const openedFileIdRef = useRef(0)
  const { begin: beginWindowFileRead, cancel: cancelWindowFileRead } = useLatestOperation()

  const current = TOOL_MAP[currentId] ?? TOOLS[0]

  const results = useMemo(() => searchTools(query), [query])
  const searching = query.trim() !== ''

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    [setFavorites],
  )

  const selectTool = useCallback(
    (id: string) => {
      setCurrentId(id)
      setQuery('')
    },
    [setCurrentId],
  )

  const openTextFile = useCallback(
    (path: string, content: string) => {
      const toolId = resolveOpenFileTool(path, content)
      setOpenedFile({ id: ++openedFileIdRef.current, toolId, path, content })
      setOpenFileError(undefined)
      setCurrentId(toolId)
      setQuery('')
    },
    [setCurrentId],
  )

  const handleWindowDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || !Array.from(event.dataTransfer.types).includes('Files')) return
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (!file) return
      const isLatest = beginWindowFileRead()
      setOpenFileError(undefined)
      try {
        const content = await readTextFile(file)
        if (isLatest()) openTextFile(file.name, content)
      } catch (reason) {
        if (isLatest()) setOpenFileError((reason as Error).message)
      }
    },
    [beginWindowFileRead, openTextFile],
  )

  // 桌面端（Tauri）文件关联桥接；Web 环境下为 no-op。
  useEffect(() => {
    // 文件关联：双击 .json/.txt 等打开 → 按内容识别并跳转到对应工具，回填输入
    const offOpen = onOpenFile(({ path, content }) => {
      cancelWindowFileRead()
      openTextFile(path, content)
    })
    return offOpen
  }, [cancelWindowFileRead, openTextFile])

  const favTools = favorites.map((id) => TOOL_MAP[id]).filter(Boolean)
  const ToolComponent = current.component

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
      onDragOver={(event) => {
        if (event.defaultPrevented || !Array.from(event.dataTransfer.types).includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={handleWindowDrop}
    >
      {/* 侧边栏 */}
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-700 dark:bg-slate-800/40 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-700">
          <FontAwesomeIcon icon={faToolbox} className="text-lg text-sky-500" />
          <span className="font-semibold">开发者工具箱</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {searching ? (
            <div className="space-y-0.5">
              <p className="px-2 py-1 text-xs font-medium text-slate-400">
                搜索结果（{results.length}）
              </p>
              {results.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-slate-400">无匹配工具</p>
              )}
              {results.map((tool) => (
                <NavItem
                  key={tool.id}
                  tool={tool}
                  active={tool.id === currentId}
                  favorite={favorites.includes(tool.id)}
                  onSelect={() => selectTool(tool.id)}
                  onToggleFav={() => toggleFavorite(tool.id)}
                />
              ))}
            </div>
          ) : (
            <>
              {favTools.length > 0 && (
                <div className="mb-3">
                  <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-400">
                    <FontAwesomeIcon icon={faStarSolid} className="text-amber-400" /> 收藏
                  </p>
                  <div className="space-y-0.5">
                    {favTools.map((tool) => (
                      <NavItem
                        key={tool.id}
                        tool={tool}
                        active={tool.id === currentId}
                        favorite
                        onSelect={() => selectTool(tool.id)}
                        onToggleFav={() => toggleFavorite(tool.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {CATEGORY_ORDER.map((cat) => {
                const tools = TOOLS.filter((t) => t.category === cat)
                if (tools.length === 0) return null
                return (
                  <div key={cat} className="mb-3">
                    <p className="px-2 py-1 text-xs font-medium text-slate-400">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <div className="space-y-0.5">
                      {tools.map((tool) => (
                        <NavItem
                          key={tool.id}
                          tool={tool}
                          active={tool.id === currentId}
                          favorite={favorites.includes(tool.id)}
                          onSelect={() => selectTool(tool.id)}
                          onToggleFav={() => toggleFavorite(tool.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </nav>
        <div className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-400 dark:border-slate-700">
          离线优先 · 数据不出本机
          <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
            {isDesktop() ? '桌面版' : 'Web 版'}
          </span>
        </div>
      </aside>

      {/* 主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title="切换侧边栏"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="relative flex-1 max-w-xl">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索工具…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-900/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(current.id)}
            title={favorites.includes(current.id) ? '取消收藏' : '收藏当前工具'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
          >
            <FontAwesomeIcon icon={favorites.includes(current.id) ? faStarSolid : faStarRegular} className={favorites.includes(current.id) ? 'text-amber-400' : ''} />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="设置"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </header>
        {openFileError && (
          <div className="flex items-center border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <span>文件打开失败：{openFileError}</span>
            <button
              type="button"
              onClick={() => setOpenFileError(undefined)}
              title="关闭"
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <OpenFileInputProvider file={openedFile?.toolId === current.id ? openedFile : null}>
            <ToolComponent key={current.id} />
          </OpenFileInputProvider>
        </main>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function NavItem({
  tool,
  active,
  favorite,
  onSelect,
  onToggleFav,
}: {
  tool: ToolMeta
  active: boolean
  favorite: boolean
  onSelect: () => void
  onToggleFav: () => void
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <ToolIcon tool={tool} />
        <span className="truncate">{tool.name}</span>
      </button>
      <button
        type="button"
        onClick={onToggleFav}
        title={favorite ? '取消收藏' : '收藏'}
        className={`shrink-0 text-sm transition-opacity ${
          favorite ? 'text-amber-400' : 'text-slate-300 opacity-0 group-hover:opacity-100 dark:text-slate-500'
        }`}
      >
        <FontAwesomeIcon icon={favorite ? faStarSolid : faStarRegular} />
      </button>
    </div>
  )
}
