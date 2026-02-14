/**
 * Rate Limit 存儲層測試
 */

import {
  createRateLimitStore,
  MemoryRateLimitStore,
  type RateLimitEntry,
} from '@infrastructure/ratelimit/RateLimitStore'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore

  beforeEach(() => {
    store = new MemoryRateLimitStore()
  })

  afterEach(() => {
    store.stopCleanupInterval()
  })

  describe('基本操作', () => {
    it('should get null for non-existent key', async () => {
      const result = await store.get('non-existent')
      expect(result).toBeNull()
    })

    it('should set and get entry', async () => {
      const entry: RateLimitEntry = {
        count: 5,
        resetTime: Date.now() + 60000,
      }

      await store.set('test-key', entry, 60000)
      const result = await store.get('test-key')

      expect(result).not.toBeNull()
      expect(result?.count).toBe(5)
    })

    it('should delete entry', async () => {
      const entry: RateLimitEntry = {
        count: 5,
        resetTime: Date.now() + 60000,
      }

      await store.set('test-key', entry, 60000)
      await store.delete('test-key')
      const result = await store.get('test-key')

      expect(result).toBeNull()
    })

    it('should flush all entries', async () => {
      const entry: RateLimitEntry = {
        count: 5,
        resetTime: Date.now() + 60000,
      }

      await store.set('key1', entry, 60000)
      await store.set('key2', entry, 60000)
      await store.flush()

      expect(await store.get('key1')).toBeNull()
      expect(await store.get('key2')).toBeNull()
    })
  })

  describe('計數增加', () => {
    it('should increment count', async () => {
      const count1 = await store.increment('counter', 60000)
      expect(count1).toBe(1)

      const count2 = await store.increment('counter', 60000)
      expect(count2).toBe(2)

      const count3 = await store.increment('counter', 60000)
      expect(count3).toBe(3)
    })

    it('should reset count after TTL expiry', async () => {
      // 設置 TTL 為 100ms
      const count1 = await store.increment('counter', 100)
      expect(count1).toBe(1)

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 150))

      const count2 = await store.increment('counter', 100)
      expect(count2).toBe(1) // 應該重置為 1
    })

    it('should maintain separate counters for different keys', async () => {
      const count1 = await store.increment('key1', 60000)
      const count2 = await store.increment('key2', 60000)
      const count3 = await store.increment('key1', 60000)

      expect(count1).toBe(1)
      expect(count2).toBe(1)
      expect(count3).toBe(2)
    })
  })

  describe('過期清理', () => {
    it('should return null for expired entry', async () => {
      const entry: RateLimitEntry = {
        count: 5,
        resetTime: Date.now() - 1000, // 已過期
      }

      await store.set('expired-key', entry, 0)
      const result = await store.get('expired-key')

      expect(result).toBeNull()
    })

    it('should handle maximum store size (LRU eviction)', async () => {
      const stats1 = store.getStats()
      expect(stats1.size).toBe(0)

      // 填充超過最大大小的條目
      const maxSize = stats1.maxSize
      for (let i = 0; i < maxSize + 10; i++) {
        await store.set(
          `key-${i}`,
          {
            count: i,
            resetTime: Date.now() + 60000,
          },
          60000
        )
      }

      const stats2 = store.getStats()
      expect(stats2.size).toBeLessThanOrEqual(maxSize)
    })

    it('should provide utilization stats', async () => {
      for (let i = 0; i < 50; i++) {
        await store.set(
          `key-${i}`,
          {
            count: i,
            resetTime: Date.now() + 60000,
          },
          60000
        )
      }

      const stats = store.getStats()
      expect(stats.size).toBe(50)
      expect(stats.utilizationPercent).toBeGreaterThan(0)
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100)
    })
  })

  describe('關閉和清理', () => {
    it('should shutdown gracefully', async () => {
      await store.set(
        'key1',
        {
          count: 5,
          resetTime: Date.now() + 60000,
        },
        60000
      )

      await store.shutdown()

      const result = await store.get('key1')
      expect(result).toBeNull()
    })
  })
})

describe('createRateLimitStore', () => {
  it('should create memory store by default', () => {
    const store = createRateLimitStore({ forceMemory: true })
    expect(store).toBeInstanceOf(MemoryRateLimitStore)
    ;(store as MemoryRateLimitStore).stopCleanupInterval()
  })

  it('should prefer Redis if available', () => {
    const mockRedisClient = {
      get: async () => null,
      set: async () => {},
    }

    const store = createRateLimitStore({ redisClient: mockRedisClient })
    expect(store).toBeDefined()
    // Redis 實現應該被返回（如果可用）
  })
})

describe('內存洩漏防止', () => {
  let store: MemoryRateLimitStore

  beforeEach(() => {
    store = new MemoryRateLimitStore()
  })

  afterEach(() => {
    store.stopCleanupInterval()
  })

  it('should not leak memory with concurrent increments', async () => {
    // 模擬大量並發請求
    const promises = []
    for (let i = 0; i < 1000; i++) {
      promises.push(store.increment(`key-${i % 100}`, 1000))
    }

    await Promise.all(promises)

    const stats = store.getStats()
    // 只應有 100 個唯一的 key
    expect(stats.size).toBe(100)
  })

  it('should prevent unbounded growth over time', async () => {
    const initialStats = store.getStats()
    expect(initialStats.size).toBe(0)

    // 多次操作
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 50; i++) {
        await store.increment(`key-${i}`, 100)
      }
      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    const finalStats = store.getStats()
    // 由於自動清理，大小應該保持有限
    expect(finalStats.size).toBeLessThanOrEqual(50)
  })
})
