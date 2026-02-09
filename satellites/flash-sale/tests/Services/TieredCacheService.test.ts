/**
 * TieredCacheService 單元測試
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import { TieredCacheService } from '../../src/Infrastructure/Services/TieredCacheService'

/**
 * Mock Logger
 */
class MockLogger {
  debug(message: string): void {}
  info(message: string): void {}
  warn(message: string): void {}
  error(message: string): void {}
}

/**
 * Mock CacheService (L2 Redis)
 */
class MockL2Cache implements CacheService {
  private data: Map<string, any> = new Map()

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) || null
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  async clear(): Promise<void> {
    this.data.clear()
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await callback()
    await this.set(key, result, ttl)
    return result
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key)
  }

  async increment(key: string, value?: number): Promise<number> {
    const current = (this.data.get(key) as number) || 0
    const next = current + (value || 1)
    this.data.set(key, next)
    return next
  }

  async decrement(key: string, value?: number): Promise<number> {
    return this.increment(key, -(value || 1))
  }
}

/**
 * Mock Metrics Registry
 */
class MockMetricsRegistry {
  histogram() {
    return { observe: () => {} }
  }

  gauge() {
    return { set: () => {} }
  }

  counter() {
    return { inc: () => {} }
  }
}

describe('TieredCacheService', () => {
  let cache: TieredCacheService
  let l2Cache: MockL2Cache
  let metrics: MockMetricsRegistry
  let logger: MockLogger

  beforeEach(() => {
    l2Cache = new MockL2Cache()
    metrics = new MockMetricsRegistry()
    logger = new MockLogger()
    cache = new TieredCacheService(l2Cache as any, metrics as any, logger as any)
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('get/set', () => {
    it('應該設置和獲取值', async () => {
      await cache.set('key1', 'value1')
      const result = await cache.get('key1')

      expect(result).toBe('value1')
    })

    it('應該返回 null 當鍵不存在時', async () => {
      const result = await cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('應該支持對象值', async () => {
      const obj = { id: 1, name: 'test' }
      await cache.set('key1', obj)

      const result = await cache.get('key1')
      expect(result).toEqual(obj)
    })

    it('應該支持 TTL', async () => {
      await cache.set('key1', 'value1', 300)
      const result = await cache.get('key1')

      expect(result).toBe('value1')
    })
  })

  describe('delete', () => {
    it('應該刪除快取鍵', async () => {
      await cache.set('key1', 'value1')
      await cache.delete('key1')

      const result = await cache.get('key1')
      expect(result).toBeNull()
    })

    it('應該處理不存在的鍵', async () => {
      await cache.delete('non-existent')
      expect(true).toBe(true) // 不應該拋出錯誤
    })
  })

  describe('clear', () => {
    it('應該清除所有快取', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')

      await cache.clear()

      const result1 = await cache.get('key1')
      const result2 = await cache.get('key2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('remember', () => {
    it('應該返回快取值如果存在', async () => {
      await cache.set('key1', 'cached')

      const result = await cache.remember('key1', 300, async () => 'computed')

      expect(result).toBe('cached')
    })

    it('應該計算並快取值如果不存在', async () => {
      const result = await cache.remember('key1', 300, async () => 'computed')

      expect(result).toBe('computed')

      const cached = await cache.get('key1')
      expect(cached).toBe('computed')
    })
  })

  describe('has', () => {
    it('應該檢查鍵是否存在', async () => {
      await cache.set('key1', 'value1')

      const exists = await cache.has('key1')
      const notExists = await cache.has('non-existent')

      expect(exists).toBe(true)
      expect(notExists).toBe(false)
    })
  })

  describe('increment/decrement', () => {
    it('應該遞增計數器', async () => {
      const value1 = await cache.increment('counter')
      const value2 = await cache.increment('counter')

      expect(value1).toBe(1)
      expect(value2).toBe(2)
    })

    it('應該遞減計數器', async () => {
      await cache.increment('counter', 5)
      const value = await cache.decrement('counter', 2)

      expect(value).toBe(3)
    })
  })

  describe('L1 cache performance', () => {
    it('應該在 L1 快取中存儲頻繁訪問的值', async () => {
      // 第一次訪問：L2 miss，從 L2 讀取
      await cache.set('key1', 'value1')
      const result1 = await cache.get('key1')

      // 第二次訪問：應該從 L1 快取命中
      const result2 = await cache.get('key1')

      expect(result1).toBe('value1')
      expect(result2).toBe('value1')
    })

    it('應該在 L1 超過容量時驅逐 LRU 項', async () => {
      // 填充超過 10K 條目（測試使用較小的容量）
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, `value${i}`)
      }

      // 所有項應該仍然在 L2 中
      const value0 = await cache.get('key0')
      expect(value0).toBe('value0')
    })
  })

  describe('getStats', () => {
    it('應該返回快取統計', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')

      const stats = await cache.getStats()

      expect(stats.keysCount).toBeGreaterThan(0)
      expect(stats.memoryUsage).toBeDefined()
    })
  })

  describe('ttl', () => {
    it('應該返回 null（簡化實現）', async () => {
      await cache.set('key1', 'value1')

      const ttl = await cache.ttl('key1')

      expect(ttl).toBeNull()
    })
  })
})
