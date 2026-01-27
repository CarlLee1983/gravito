import { useCallback, useState } from 'react'
import type { UseErrorHandlerReturn } from '../types'

/**
 * 錯誤處理 Hook
 *
 * 統一管理錯誤狀態、顯示、清除和重試邏輯。
 *
 * @returns 錯誤狀態和操作方法
 *
 * @example
 * ```tsx
 * const { error, handleError, clearError, retry } = useErrorHandler()
 *
 * try {
 *   await riskyOperation()
 * } catch (err) {
 *   handleError(err as Error)
 * }
 *
 * // 清除錯誤
 * clearError()
 *
 * // 重試
 * retry()
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null)
  const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null)

  /**
   * 處理錯誤
   */
  const handleError = useCallback((err: Error, retry?: () => void) => {
    console.error('[ErrorHandler]', err)
    setError(err)

    if (retry) {
      setRetryCallback(() => retry)
    }
  }, [])

  /**
   * 清除錯誤
   */
  const clearError = useCallback(() => {
    setError(null)
    setRetryCallback(null)
  }, [])

  /**
   * 重試
   */
  const retry = useCallback(() => {
    if (retryCallback) {
      clearError()
      retryCallback()
    }
  }, [retryCallback, clearError])

  return {
    error,
    handleError,
    clearError,
    retry,
  }
}
