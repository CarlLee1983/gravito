import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createBeam } from '../src'
import { RequestDeduplicator } from '../src/utils'

describe('Request Deduplication (v1.2)', () => {
  describe('RequestDeduplicator', () => {
    let deduplicator: RequestDeduplicator

    beforeEach(() => {
      deduplicator = new RequestDeduplicator(1000)
    })

    test('should create instance with default window', () => {
      const ded = new RequestDeduplicator()
      expect(ded.size).toBe(0)
    })

    test('should generate unique keys for different URLs', () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      deduplicator.fetch(mockFetch, 'http://localhost/api/users', { method: 'GET' })
      deduplicator.fetch(mockFetch, 'http://localhost/api/posts', { method: 'GET' })

      expect(deduplicator.size).toBe(2)
    })

    test('should deduplicate identical GET requests', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      // Fire two identical requests
      const promise1 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
      })
      const promise2 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
      })

      await Promise.all([promise1, promise2])

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should NOT deduplicate POST requests', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      // Fire two identical POST requests
      const promise1 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'POST',
      })
      const promise2 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'POST',
      })

      await Promise.all([promise1, promise2])

      // Should call fetch twice
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should clear cache after request completes', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      await deduplicator.fetch(mockFetch, 'http://localhost/api/users', { method: 'GET' })

      // Cache should be empty after completion
      expect(deduplicator.size).toBe(0)
    })

    test('should clear cache on error', async () => {
      const mockFetch = mock(() => Promise.reject(new Error('Network error')))

      await expect(
        deduplicator.fetch(mockFetch, 'http://localhost/api/users', { method: 'GET' })
      ).rejects.toThrow('Network error')

      // Cache should be empty after error
      expect(deduplicator.size).toBe(0)
    })

    test('should return cloned responses for concurrent requests', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('{"data":"test"}')))

      const promise1 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
      })
      const promise2 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
      })

      const [res1, res2] = await Promise.all([promise1, promise2])

      // Both should be able to read the body independently
      const data1 = await res1.json()
      const data2 = await res2.json()

      expect(data1).toEqual({ data: 'test' })
      expect(data2).toEqual({ data: 'test' })
    })

    test('should clear all cache entries', () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      deduplicator.fetch(mockFetch, 'http://localhost/api/users', { method: 'GET' })
      deduplicator.fetch(mockFetch, 'http://localhost/api/posts', { method: 'GET' })

      expect(deduplicator.size).toBe(2)

      deduplicator.clear()

      expect(deduplicator.size).toBe(0)
    })

    test('should unref deduplication eviction timers', async () => {
      const originalSetTimeout = global.setTimeout
      const handle = {
        unrefCalled: false,
        unref() {
          this.unrefCalled = true
        },
      }
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      global.setTimeout = ((_fn: () => void) => handle as any) as unknown as typeof setTimeout

      try {
        await deduplicator.fetch(mockFetch, 'http://localhost/api/users', { method: 'GET' })
        expect(handle.unrefCalled).toBe(true)
      } finally {
        global.setTimeout = originalSetTimeout
      }
    })

    test('should include relevant headers in cache key', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('ok')))

      // Same URL but different Accept headers
      const promise1 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      const promise2 = deduplicator.fetch(mockFetch, 'http://localhost/api/users', {
        method: 'GET',
        headers: { Accept: 'application/xml' },
      })

      await Promise.all([promise1, promise2])

      // Should call fetch twice due to different Accept headers
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Beam with Deduplication', () => {
    test('should deduplicate requests when enabled', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('{"data":"test"}')))
      global.fetch = mockFetch

      const client = createBeam<any>('http://localhost', {
        deduplicate: true,
      })

      // Fire two identical requests
      const promise1 = client.users.$get()
      const promise2 = client.users.$get()

      await Promise.all([promise1, promise2])

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should NOT deduplicate when disabled (default)', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('{"data":"test"}')))
      global.fetch = mockFetch

      const client = createBeam<any>('http://localhost')

      // Fire two identical requests
      const promise1 = client.users.$get()
      const promise2 = client.users.$get()

      await Promise.all([promise1, promise2])

      // Should call fetch twice
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should respect custom deduplication window', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('{"data":"test"}')))
      global.fetch = mockFetch

      const client = createBeam<any>('http://localhost', {
        deduplicate: true,
        deduplicateWindow: 500, // 500ms window
      })

      await client.users.$get()

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 600))

      await client.users.$get()

      // Should call fetch twice (window expired)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
