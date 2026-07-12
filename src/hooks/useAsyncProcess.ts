import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * 大文本异步处理 hook。
 *
 * 背景：各工具原先在渲染期用 useMemo 同步计算，遇到超大输入（如 5MB+ JSON）
 * 时每次按键都会同步阻塞主线程，界面卡顿（需求 §6.1）。
 *
 * 策略（一套代码兼顾两种规模）：
 * - **小输入**（<= asyncThreshold，默认 10 万字符）：仍在渲染期同步计算，
 *   零闪烁、零延迟，满足"常规数据 < 100ms、输入即处理"。
 * - **大输入**：改为防抖 + 延迟到渲染之后执行，避免每次按键都阻塞；
 *   处理期间暴露 pending=true 供 UI 显示"处理中…"进度提示；
 *   并保留上一次结果不清空，避免闪烁；用序号守卫丢弃过期计算结果。
 *
 * 用法与既有 useMemo 几乎一致：把处理函数与依赖传入即可。
 */
export interface AsyncProcessResult<T> {
  /** 处理结果；大输入处理期间为上一次的结果（不清空以避免闪烁） */
  result: T | undefined
  /** 处理抛出的错误信息 */
  error?: string
  /** 是否正在异步处理（仅大输入会为 true），供进度提示使用 */
  pending: boolean
  /** 当前是否走大输入异步路径 */
  large: boolean
}

export interface AsyncProcessOptions {
  /** 超过该输入长度（字符数）才走异步路径。默认 100_000 */
  asyncThreshold?: number
  /** 大输入异步路径的防抖时间（毫秒）。默认 200 */
  debounceMs?: number
}

/**
 * @param input   主输入文本（其长度决定同步/异步路径）
 * @param process 处理函数（同步、纯 CPU）。可能抛错，错误会被捕获进 error。
 * @param deps    额外依赖（如模式、缩进等），变化时重新计算。input 无需重复传入。
 */
export function useAsyncProcess<T>(
  input: string,
  process: (input: string) => T,
  deps: unknown[] = [],
  options: AsyncProcessOptions = {},
): AsyncProcessResult<T> {
  const { asyncThreshold = 100_000, debounceMs = 200 } = options
  const large = input.length > asyncThreshold

  // 始终引用最新的处理函数，避免把每次渲染新建的函数放进依赖数组
  const processRef = useRef(process)
  processRef.current = process

  // ---- 同步快路径：小输入在渲染期直接算 ----
  const sync = useMemo(() => {
    if (large) return null
    try {
      return { result: processRef.current(input) as T | undefined, error: undefined as string | undefined }
    } catch (e) {
      return { result: undefined as T | undefined, error: (e as Error).message }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, large, ...deps])

  // ---- 异步慢路径：大输入防抖 + 延迟计算 ----
  const [asyncState, setAsyncState] = useState<{ result?: T; error?: string; pending: boolean }>({
    result: undefined,
    error: undefined,
    pending: false,
  })
  const seqRef = useRef(0)

  useEffect(() => {
    if (!large) return
    const seq = ++seqRef.current
    // 保留上一次 result，仅标记处理中，避免大输入重算时输出闪空
    setAsyncState((s) => ({ ...s, pending: true }))
    const id = setTimeout(() => {
      if (seq !== seqRef.current) return // 已被更新的输入取代，丢弃
      try {
        const result = processRef.current(input) as T
        setAsyncState({ result, error: undefined, pending: false })
      } catch (e) {
        setAsyncState({ result: undefined, error: (e as Error).message, pending: false })
      }
    }, debounceMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, large, debounceMs, ...deps])

  // 切回小输入时让异步序号失效，避免残留的异步结果覆盖同步结果
  useEffect(() => {
    if (!large) seqRef.current++
  }, [large])

  if (!large) {
    return { result: sync?.result, error: sync?.error, pending: false, large: false }
  }
  return { result: asyncState.result, error: asyncState.error, pending: asyncState.pending, large: true }
}
