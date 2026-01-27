import { useEffect, useRef } from 'react'
import type { ComponentType } from 'react'

/**
 * 開發環境下的效能監控 HOC
 *
 * 追蹤組件渲染次數，協助識別不必要的重新渲染。
 *
 * @param Component - 要追蹤的組件
 * @param componentName - 組件名稱（用於日誌）
 * @returns 包裝後的組件
 *
 * @example
 * ```tsx
 * const TrackedChatMessage = withPerformanceTracking(ChatMessage, 'ChatMessage')
 * ```
 */
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  // 生產環境直接返回原組件
  if (process.env.NODE_ENV !== 'development') {
    return Component
  }

  return function TrackedComponent(props: P) {
    const renderCount = useRef(0)
    const lastRenderTime = useRef(Date.now())

    useEffect(() => {
      renderCount.current++
      const now = Date.now()
      const timeSinceLastRender = now - lastRenderTime.current
      lastRenderTime.current = now

      console.log(
        `[Performance] ${componentName} rendered ${renderCount.current} times (${timeSinceLastRender}ms since last render)`
      )
    })

    return <Component {...props} />
  }
}

/**
 * 追蹤組件渲染次數的 Hook
 *
 * 在開發環境下記錄組件的渲染次數和渲染間隔。
 *
 * @param componentName - 組件名稱
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTracking('MyComponent')
 *   // ...
 * }
 * ```
 */
export function useRenderTracking(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())

  renderCount.current++
  const now = Date.now()
  const timeSinceLastRender = now - lastRenderTime.current
  lastRenderTime.current = now

  if (renderCount.current > 1) {
    console.log(
      `[Performance] ${componentName} rendered ${renderCount.current} times (${timeSinceLastRender}ms since last render)`
    )
  }
}

/**
 * 效能分析器
 *
 * 測量函數執行時間。
 *
 * @param fn - 要測量的函數
 * @param label - 標籤（用於日誌）
 * @returns 包裝後的函數
 *
 * @example
 * ```tsx
 * const sortMessages = measurePerformance(
 *   (messages) => messages.sort(...),
 *   'sortMessages'
 * )
 * ```
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  if (process.env.NODE_ENV !== 'development') {
    return fn
  }

  return ((...args: Parameters<T>) => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()

    console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`)

    return result
  }) as T
}

/**
 * 異步效能分析器
 *
 * 測量異步函數執行時間。
 *
 * @param fn - 要測量的異步函數
 * @param label - 標籤（用於日誌）
 * @returns 包裝後的異步函數
 *
 * @example
 * ```tsx
 * const fetchMessages = measureAsyncPerformance(
 *   async (id) => api.getMessages(id),
 *   'fetchMessages'
 * )
 * ```
 */
export function measureAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  label: string
): T {
  if (process.env.NODE_ENV !== 'development') {
    return fn
  }

  return (async (...args: Parameters<T>) => {
    const start = performance.now()
    const result = await fn(...args)
    const end = performance.now()

    console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`)

    return result
  }) as T
}
