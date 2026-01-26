import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { Photon } from '@gravito/photon'
import { BeamTimeoutError } from '../src/errors'
import { createBeam } from '../src/index'

// 建立測試用的 Photon app
const app = new Photon()
  .get('/users', (c) => c.json({ users: ['Alice', 'Bob'] }))
  .get('/users/:id', (c) => c.json({ id: c.req.param('id'), name: 'Alice' }))
  .post('/users', (c) => c.json({ id: 1, name: 'New User' }))
  .put('/users/:id', (c) => c.json({ id: c.req.param('id'), updated: true }))
  .delete('/users/:id', (c) => c.json({ deleted: true }))

type TestAppType = typeof app

describe('Integration Tests', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('Basic HTTP operations', () => {
    test('should handle successful GET request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ users: ['Alice', 'Bob'] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users.$get()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ users: ['Alice', 'Bob'] })
    })

    test('should handle successful POST request with body', async () => {
      const mockFetch = mock((_input: any, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string)
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1, name: body.name }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users.$post({ json: { name: 'New User' } })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.name).toBe('New User')
    })

    test('should handle successful PUT request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: 1, updated: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users[':id'].$put({
        param: { id: '1' },
        json: { name: 'Updated' },
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.updated).toBe(true)
    })

    test('should handle successful DELETE request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ deleted: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users[':id'].$delete({ param: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.deleted).toBe(true)
    })
  })

  describe('Error handling', () => {
    test('should handle 4xx response correctly', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users.$get()

      expect(res.status).toBe(404)
      expect(res.ok).toBe(false)
    })

    test('should handle 5xx response correctly', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users.$get()

      expect(res.status).toBe(500)
      expect(res.ok).toBe(false)
    })
  })

  describe('Timeout behavior', () => {
    test('should succeed within timeout', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ users: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        timeout: 5000,
      })
      const res = await client.users.$get()

      expect(res.status).toBe(200)
    })

    test('should throw BeamTimeoutError when timeout exceeded', async () => {
      const mockFetch = mock((_input: any, init?: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
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
      })

      await expect(client.users.$get()).rejects.toThrow(BeamTimeoutError)
    })
  })

  describe('Retry behavior', () => {
    test('should not retry by default', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Server Error' }), {
            status: 500,
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000')
      const res = await client.users.$get()

      expect(res.status).toBe(500)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should retry on configured status codes', async () => {
      let callCount = 0
      const mockFetch = mock(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Server Error' }), {
              status: 500,
            })
          )
        }
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        retry: {
          count: 3,
          delay: 10,
          statusCodes: [500],
        },
      })
      const res = await client.users.$get()

      expect(res.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('should not retry on non-retryable status codes', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        retry: {
          count: 3,
          delay: 10,
          statusCodes: [500, 502, 503],
        },
      })
      const res = await client.users.$get()

      expect(res.status).toBe(404)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should respect max retry count', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Server Error' }), {
            status: 500,
          })
        )
      )
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        retry: {
          count: 2,
          delay: 10,
          statusCodes: [500],
        },
      })
      const res = await client.users.$get()

      expect(res.status).toBe(500)
      expect(mockFetch).toHaveBeenCalledTimes(3) // 1 初始 + 2 重試
    })
  })

  describe('Headers', () => {
    test('should include static headers', async () => {
      let capturedHeaders: Headers | undefined

      const mockFetch = mock((_input: any, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers)
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        headers: { 'X-Custom': 'value' },
      })
      await client.users.$get()

      expect(capturedHeaders?.get('X-Custom')).toBe('value')
    })

    test('should resolve dynamic headers', async () => {
      let capturedHeaders: Headers | undefined

      const mockFetch = mock((_input: any, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers)
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      })
      globalThis.fetch = mockFetch

      const client = createBeam<TestAppType>('http://localhost:3000', {
        headers: () => ({ 'X-Token': 'abc123' }),
      })
      await client.users.$get()

      expect(capturedHeaders?.get('X-Token')).toBe('abc123')
    })
  })
})
