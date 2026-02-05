import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { IdempotencyCache } from '../src/events/IdempotencyCache'

describe('IdempotencyCache', () => {
  let cache: IdempotencyCache

  beforeEach(() => {
    cache = new IdempotencyCache()
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('isDuplicate', () => {
    it('should return false for a new key', () => {
      expect(cache.isDuplicate('key1', 5000)).toBe(false)
    })

    it('should return true for a duplicate key within TTL', () => {
      cache.isDuplicate('key1', 5000) // 第一次記錄
      expect(cache.isDuplicate('key1', 5000)).toBe(true) // 重複
    })

    it('should return false for empty key', () => {
      expect(cache.isDuplicate('', 5000)).toBe(false)
    })

    it('should return false when TTL has expired', async () => {
      cache.isDuplicate('key1', 50) // TTL 50ms
      await new Promise((resolve) => setTimeout(resolve, 100)) // 等待過期
      expect(cache.isDuplicate('key1', 50)).toBe(false) // TTL 已過期，不算重複
    })

    it('should handle multiple distinct keys independently', () => {
      expect(cache.isDuplicate('key1', 5000)).toBe(false)
      expect(cache.isDuplicate('key2', 5000)).toBe(false)
      expect(cache.isDuplicate('key1', 5000)).toBe(true)
      expect(cache.isDuplicate('key2', 5000)).toBe(true)
    })
  })

  describe('recordEvent', () => {
    it('should record a new event', () => {
      cache.recordEvent('event1')
      expect(cache.getSize()).toBe(1)
    })

    it('should ignore empty key', () => {
      cache.recordEvent('')
      expect(cache.getSize()).toBe(0)
    })

    it('should overwrite existing entry timestamp', () => {
      cache.recordEvent('event1')
      const size1 = cache.getSize()
      cache.recordEvent('event1')
      const size2 = cache.getSize()
      expect(size1).toBe(1)
      expect(size2).toBe(1)
    })
  })

  describe('remove', () => {
    it('should remove an existing entry', () => {
      cache.recordEvent('key1')
      expect(cache.getSize()).toBe(1)

      const removed = cache.remove('key1')
      expect(removed).toBe(true)
      expect(cache.getSize()).toBe(0)
    })

    it('should return false when key not found', () => {
      const removed = cache.remove('nonexistent')
      expect(removed).toBe(false)
    })

    it('should return false for empty key', () => {
      const removed = cache.remove('')
      expect(removed).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.recordEvent('key1')
      cache.recordEvent('key2')
      cache.recordEvent('key3')
      expect(cache.getSize()).toBe(3)

      cache.clear()
      expect(cache.getSize()).toBe(0)
    })

    it('should work on empty cache', () => {
      cache.clear()
      expect(cache.getSize()).toBe(0)
    })
  })

  describe('getSize', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.getSize()).toBe(0)
    })

    it('should return correct count', () => {
      cache.recordEvent('a')
      cache.recordEvent('b')
      expect(cache.getSize()).toBe(2)
    })
  })

  describe('stopCleanup', () => {
    it('should stop the periodic cleanup interval', () => {
      cache.stopCleanup()
      // 不應拋出錯誤
    })

    it('should be idempotent (can call multiple times)', () => {
      cache.stopCleanup()
      cache.stopCleanup()
      // 不應拋出錯誤
    })
  })

  describe('destroy', () => {
    it('should stop cleanup and clear cache', () => {
      cache.recordEvent('key1')
      cache.recordEvent('key2')
      expect(cache.getSize()).toBe(2)

      cache.destroy()
      expect(cache.getSize()).toBe(0)
    })

    it('should be safe to call multiple times', () => {
      cache.destroy()
      cache.destroy()
      // 不應拋出錯誤
    })
  })

  describe('cleanup (internal)', () => {
    it('should remove entries older than 24 hours', async () => {
      // 直接操作內部 cache 來模擬過期條目
      const internalCache = (cache as any).cache as Map<string, { timestamp: number }>

      // 加入一個 25 小時前的條目
      const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000
      internalCache.set('old-key', { timestamp: twentyFiveHoursAgo })

      // 加入一個新的條目
      cache.recordEvent('new-key')

      expect(cache.getSize()).toBe(2)

      // 手動觸發 cleanup
      ;(cache as any).cleanup()

      // 舊條目應被移除，新條目保留
      expect(cache.getSize()).toBe(1)
      expect(internalCache.has('old-key')).toBe(false)
      expect(internalCache.has('new-key')).toBe(true)
    })

    it('should keep entries within 24 hours', () => {
      cache.recordEvent('fresh-key')

      ;(cache as any).cleanup()

      expect(cache.getSize()).toBe(1)
    })
  })
})
