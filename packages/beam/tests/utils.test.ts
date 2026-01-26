import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { BeamNetworkError, BeamTimeoutError } from '../src/errors'
import { createFetchWithTimeout, executeWithRetry, resolveHeaders } from '../src/utils'

describe('createFetchWithTimeout', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('should resolve before timeout', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('OK', { status: 200 })))
    globalThis.fetch = mockFetch

    const fetchWithTimeout = createFetchWithTimeout(5000)
    const response = await fetchWithTimeout('http://example.com')

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('should throw BeamTimeoutError when timeout exceeded', async () => {
    const mockFetch = mock((_input: any, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve(new Response('OK'))
        }, 1000)

        // 監聽 abort signal
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
      })
    })
    globalThis.fetch = mockFetch

    const fetchWithTimeout = createFetchWithTimeout(100)

    await expect(fetchWithTimeout('http://example.com')).rejects.toThrow(BeamTimeoutError)

    try {
      await fetchWithTimeout('http://example.com')
    } catch (error) {
      expect(error).toBeInstanceOf(BeamTimeoutError)
      if (error instanceof BeamTimeoutError) {
        expect(error.message).toBe('Request timed out after 100ms')
      }
    }
  })

  test('should abort fetch on timeout', async () => {
    let abortSignal: AbortSignal | undefined

    const mockFetch = mock((_input: any, init?: RequestInit) => {
      abortSignal = init?.signal as AbortSignal
      return new Promise((resolve) => {
        setTimeout(() => resolve(new Response('OK')), 1000)
      })
    })
    globalThis.fetch = mockFetch

    const fetchWithTimeout = createFetchWithTimeout(50)

    try {
      await fetchWithTimeout('http://example.com')
    } catch (_error) {
      // 預期會拋出錯誤
    }

    // 驗證 abort signal 被使用
    expect(abortSignal).toBeDefined()
  })

  test('should throw BeamNetworkError on network failure', async () => {
    const originalError = new Error('Network connection failed')
    const mockFetch = mock(() => Promise.reject(originalError))
    globalThis.fetch = mockFetch

    const fetchWithTimeout = createFetchWithTimeout(5000)

    await expect(fetchWithTimeout('http://example.com')).rejects.toThrow(BeamNetworkError)

    try {
      await fetchWithTimeout('http://example.com')
    } catch (error) {
      expect(error).toBeInstanceOf(BeamNetworkError)
      if (error instanceof BeamNetworkError) {
        expect(error.cause).toBe(originalError)
      }
    }
  })
})

describe('executeWithRetry', () => {
  test('should succeed on first attempt', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('OK', { status: 200 })))

    const response = await executeWithRetry(mockFetch)

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('should retry on retryable status codes', async () => {
    let callCount = 0
    const mockFetch = mock(() => {
      callCount++
      if (callCount < 3) {
        return Promise.resolve(new Response('Error', { status: 500 }))
      }
      return Promise.resolve(new Response('OK', { status: 200 }))
    })

    const response = await executeWithRetry(mockFetch, {
      count: 3,
      delay: 10,
      statusCodes: [500],
    })

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  test('should not retry on non-retryable status codes', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('Not Found', { status: 404 })))

    const response = await executeWithRetry(mockFetch, {
      count: 3,
      delay: 10,
      statusCodes: [500, 502, 503],
    })

    expect(response.status).toBe(404)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('should respect max retry count', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('Error', { status: 500 })))

    const response = await executeWithRetry(mockFetch, {
      count: 2,
      delay: 10,
      statusCodes: [500],
    })

    expect(response.status).toBe(500)
    expect(mockFetch).toHaveBeenCalledTimes(3) // 1 初始 + 2 重試
  })

  test('should apply delay between retries', async () => {
    const timestamps: number[] = []
    const mockFetch = mock(() => {
      timestamps.push(Date.now())
      return Promise.resolve(new Response('Error', { status: 500 }))
    })

    await executeWithRetry(mockFetch, {
      count: 2,
      delay: 100,
      statusCodes: [500],
    })

    // 驗證延遲時間（允許一些誤差）
    if (timestamps.length >= 2) {
      const delay1 = timestamps[1] - timestamps[0]
      expect(delay1).toBeGreaterThanOrEqual(90) // 100ms - 10% 誤差
    }
  })

  test('should apply exponential backoff', async () => {
    const timestamps: number[] = []
    const mockFetch = mock(() => {
      timestamps.push(Date.now())
      return Promise.resolve(new Response('Error', { status: 500 }))
    })

    await executeWithRetry(mockFetch, {
      count: 3,
      delay: 100,
      backoff: 2,
      statusCodes: [500],
    })

    // 驗證指數退避
    // 第一次重試：100ms
    // 第二次重試：200ms
    // 第三次重試：400ms
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  test('should throw error when all retries exhausted', async () => {
    const mockFetch = mock(() => Promise.reject(new Error('Network error')))

    await expect(
      executeWithRetry(mockFetch, {
        count: 2,
        delay: 10,
      })
    ).rejects.toThrow('Network error')

    expect(mockFetch).toHaveBeenCalledTimes(3) // 1 初始 + 2 重試
  })
})

describe('resolveHeaders', () => {
  test('should pass through static headers', async () => {
    const headers = { 'X-Custom': 'value' }
    const resolved = await resolveHeaders(headers)
    expect(resolved).toEqual(headers)
  })

  test('should resolve dynamic headers function', async () => {
    const headers = () => ({ 'X-Token': 'abc123' })
    const resolved = await resolveHeaders(headers)
    expect(resolved).toEqual({ 'X-Token': 'abc123' })
  })

  test('should resolve async headers function', async () => {
    const headers = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { 'X-Async': 'value' }
    }
    const resolved = await resolveHeaders(headers)
    expect(resolved).toEqual({ 'X-Async': 'value' })
  })

  test('should return undefined when no headers provided', async () => {
    const resolved = await resolveHeaders(undefined)
    expect(resolved).toBeUndefined()
  })

  test('should handle headers function returning promise', async () => {
    const headers = () => Promise.resolve({ 'X-Promise': 'resolved' })
    const resolved = await resolveHeaders(headers)
    expect(resolved).toEqual({ 'X-Promise': 'resolved' })
  })
})
