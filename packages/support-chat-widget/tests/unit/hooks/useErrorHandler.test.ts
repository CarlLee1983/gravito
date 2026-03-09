import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useErrorHandler } from '../../../src/hooks/useErrorHandler'

describe('useErrorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('初始狀態應該沒有錯誤', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(result.current.error).toBeNull()
  })

  it('應該能夠設置錯誤', () => {
    const { result } = renderHook(() => useErrorHandler())
    const testError = new Error('Test error')

    act(() => {
      result.current.handleError(testError)
    })

    expect(result.current.error).toBe(testError)
  })

  it('應該能夠清除錯誤', () => {
    const { result } = renderHook(() => useErrorHandler())
    const testError = new Error('Test error')

    act(() => {
      result.current.handleError(testError)
    })

    expect(result.current.error).toBe(testError)

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('應該能夠保存重試函數', () => {
    const { result } = renderHook(() => useErrorHandler())
    const testError = new Error('Test error')
    const retryFn = vi.fn()

    act(() => {
      result.current.handleError(testError, retryFn)
    })

    expect(result.current.error).toBe(testError)

    act(() => {
      result.current.retry()
    })

    expect(retryFn).toHaveBeenCalledOnce()
  })

  it('沒有重試函數時呼叫 retry 不應該出錯', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(() => {
      act(() => {
        result.current.retry()
      })
    }).not.toThrow()
  })

  it('重試後應該清除錯誤', () => {
    const { result } = renderHook(() => useErrorHandler())
    const testError = new Error('Test error')
    const retryFn = vi.fn()

    act(() => {
      result.current.handleError(testError, retryFn)
    })

    expect(result.current.error).toBe(testError)

    act(() => {
      result.current.retry()
    })

    expect(result.current.error).toBeNull()
    expect(retryFn).toHaveBeenCalledOnce()
  })

  it('重複處理錯誤應該更新錯誤', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error1 = new Error('Error 1')
    const error2 = new Error('Error 2')

    act(() => {
      result.current.handleError(error1)
    })

    expect(result.current.error).toBe(error1)

    act(() => {
      result.current.handleError(error2)
    })

    expect(result.current.error).toBe(error2)
  })
})
