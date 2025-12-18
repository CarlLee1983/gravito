import { beforeEach, describe, expect, it } from 'bun:test'
import type { SitemapEntry } from '../../src/interfaces'
import { MemoryCache } from '../../src/storage/MemoryCache'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache(60) // 60 seconds TTL
  })

  describe('get() and set()', () => {
    it('should return null when cache is empty', () => {
      const result = cache.get()
      expect(result).toBeNull()
    })

    it('should store and retrieve entries', () => {
      const entries: SitemapEntry[] = [
        { url: '/page1', priority: 0.8 },
        { url: '/page2', priority: 0.6 },
      ]

      cache.set(entries)
      const result = cache.get()

      expect(result).toEqual(entries)
    })

    it('should return null after TTL expires', async () => {
      const shortCache = new MemoryCache(0.1) // 100ms TTL
      const entries: SitemapEntry[] = [{ url: '/test' }]

      shortCache.set(entries)
      expect(shortCache.get()).toEqual(entries)

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(shortCache.get()).toBeNull()
    })

    it('should overwrite previous cache when set again', () => {
      const entries1: SitemapEntry[] = [{ url: '/old' }]
      const entries2: SitemapEntry[] = [{ url: '/new' }]

      cache.set(entries1)
      cache.set(entries2)

      const result = cache.get()
      expect(result).toEqual(entries2)
    })
  })

  describe('clear()', () => {
    it('should clear the cache', () => {
      cache.set([{ url: '/test' }])
      expect(cache.get()).not.toBeNull()

      cache.clear()
      expect(cache.get()).toBeNull()
    })
  })

  describe('lock() and unlock() - Mutex', () => {
    it('should acquire lock when not locked', async () => {
      const isOwner = await cache.lock()
      expect(isOwner).toBe(true)
    })

    it('should queue waiters when locked', async () => {
      // First caller acquires lock
      const firstLock = await cache.lock()
      expect(firstLock).toBe(true)

      // Second caller should wait (we'll test this by checking the resolved value)
      let secondResolved = false
      let secondIsOwner: boolean | null = null

      const secondPromise = cache.lock().then((result) => {
        secondResolved = true
        secondIsOwner = result
        return result
      })

      // Give some time to ensure second is queued
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(secondResolved).toBe(false) // Should still be waiting

      // Unlock
      cache.unlock()

      // Now second should resolve
      await secondPromise
      expect(secondResolved).toBe(true)
      expect(secondIsOwner).toBe(false) // Waiter gets false (someone else did work)
    })

    it('should process queue in order (FIFO)', async () => {
      const order: number[] = []

      await cache.lock() // First acquires

      // Queue up multiple waiters
      const waiter1 = cache.lock().then(() => {
        order.push(1)
      })
      const waiter2 = cache.lock().then(() => {
        order.push(2)
      })
      const waiter3 = cache.lock().then(() => {
        order.push(3)
      })

      // Give time to queue
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Unlock sequentially
      cache.unlock() // Releases to waiter1
      await waiter1

      cache.unlock() // Releases to waiter2
      await waiter2

      cache.unlock() // Releases to waiter3
      await waiter3

      expect(order).toEqual([1, 2, 3])
    })
  })
})
