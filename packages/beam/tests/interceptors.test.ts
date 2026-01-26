import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { Photon } from '@gravito/photon'
import { BeamError, BeamNetworkError } from '../src/errors'
import { createBeam } from '../src/index'

// 建立測試用的 Photon app
const app = new Photon().get('/test', (c) => c.json({ message: 'ok' }))

type TestAppType = typeof app

describe('Interceptors', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('onRequest', () => {
    test('should be called before request', async () => {
      let interceptorCalled = false

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          interceptorCalled = true
          return config
        },
      })

      await client.test.$get()

      expect(interceptorCalled).toBe(true)
    })

    test('should receive request config', async () => {
      let capturedConfig: RequestInit | undefined

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          capturedConfig = config
          return config
        },
      })

      await client.test.$get()

      expect(capturedConfig).toBeDefined()
      expect(capturedConfig?.method).toBeDefined()
    })

    test('should allow modifying request config', async () => {
      let capturedHeaders: Headers | undefined

      const mockFetch = mock((_input: any, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers)
        return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          return {
            ...config,
            headers: {
              ...(config.headers as object),
              'X-Modified': 'true',
            },
          }
        },
      })

      await client.test.$get()

      expect(capturedHeaders?.get('X-Modified')).toBe('true')
    })

    test('should support async interceptor', async () => {
      let interceptorCalled = false

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          interceptorCalled = true
          return config
        },
      })

      await client.test.$get()

      expect(interceptorCalled).toBe(true)
    })

    test('should pass modified config to fetch', async () => {
      let fetchedMethod: string | undefined

      const mockFetch = mock((_input: any, init?: RequestInit) => {
        fetchedMethod = init?.method
        return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          return {
            ...config,
            method: 'POST',
          }
        },
      })

      await client.test.$get()

      expect(fetchedMethod).toBe('POST')
    })
  })

  describe('onResponse', () => {
    test('should be called after successful response', async () => {
      let interceptorCalled = false

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onResponse: async (response) => {
          interceptorCalled = true
          return response
        },
      })

      await client.test.$get()

      expect(interceptorCalled).toBe(true)
    })

    test('should receive response object', async () => {
      let capturedResponse: Response | undefined

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onResponse: async (response) => {
          capturedResponse = response
          return response
        },
      })

      await client.test.$get()

      expect(capturedResponse).toBeDefined()
      expect(capturedResponse?.status).toBe(200)
    })

    test('should allow modifying response', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onResponse: async (response) => {
          // 修改響應狀態
          return new Response(response.body, { status: 201 })
        },
      })

      const res = await client.test.$get()

      expect(res.status).toBe(201)
    })

    test('should support async interceptor', async () => {
      let interceptorCalled = false

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onResponse: async (response) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          interceptorCalled = true
          return response
        },
      })

      await client.test.$get()

      expect(interceptorCalled).toBe(true)
    })
  })

  describe('onError', () => {
    test('should be called on network error', async () => {
      let capturedError: BeamError | undefined

      const mockFetch = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onError: async (error) => {
          capturedError = error
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }

      expect(capturedError).toBeDefined()
      expect(capturedError).toBeInstanceOf(BeamNetworkError)
    })

    test('should be called on timeout error', async () => {
      let capturedError: BeamError | undefined

      const mockFetch = mock((_input: any, init?: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response('OK', { status: 200 }))
          }, 1000)

          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId)
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }
        })
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        timeout: 100,
        onError: async (error) => {
          capturedError = error
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }

      expect(capturedError).toBeDefined()
    })

    test('should receive BeamError instance', async () => {
      const mockFetch = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onError: async (error) => {
          expect(error).toBeInstanceOf(BeamError)
          expect(error.message).toBe('Request failed')
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }
    })

    test('should support async handler', async () => {
      let handlerCompleted = false

      const mockFetch = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onError: async (_error) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          handlerCompleted = true
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }

      expect(handlerCompleted).toBe(true)
    })

    test('should not swallow errors (re-throw)', async () => {
      const mockFetch = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onError: async (_error) => {
          // 攔截器不應該阻止錯誤拋出
        },
      })

      await expect(client.test.$get()).rejects.toThrow()
    })
  })

  describe('Interceptor chain', () => {
    test('should execute in correct order: onRequest -> fetch -> onResponse', async () => {
      const order: string[] = []

      const mockFetch = mock(() => {
        order.push('fetch')
        return Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async (config) => {
          order.push('onRequest')
          return config
        },
        onResponse: async (response) => {
          order.push('onResponse')
          return response
        },
      })

      await client.test.$get()

      expect(order).toEqual(['onRequest', 'fetch', 'onResponse'])
    })

    test('should skip onResponse on error', async () => {
      let onResponseCalled = false

      const mockFetch = mock(() => Promise.reject(new Error('Network error')))
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onResponse: async (response) => {
          onResponseCalled = true
          return response
        },
        onError: async () => {
          // 處理錯誤
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }

      expect(onResponseCalled).toBe(false)
    })

    test('should call onError even when onRequest throws', async () => {
      let onErrorCalled = false

      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        onRequest: async () => {
          throw new Error('onRequest error')
        },
        onError: async (_error) => {
          onErrorCalled = true
        },
      })

      try {
        await client.test.$get()
      } catch (_error) {
        // 預期會拋出錯誤
      }

      expect(onErrorCalled).toBe(true)
    })
  })
})
