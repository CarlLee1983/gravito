/**
 * HotnessTracker 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RedisClientContract } from '@gravito/plasma'
import { HotnessTracker } from '../../src/Infrastructure/Services/HotnessTracker'

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
 * Mock Redis Client
 */
class MockRedisClient implements Partial<RedisClientContract> {
  private data: Map<string, any> = new Map()

  async zadd(key: string, options: any): Promise<number> {
    const existing = this.data.get(key) || new Map()
    const currentScore = existing.get(options.member) || 0
    // 模擬增加分數（INCR 行為）
    existing.set(options.member, currentScore + options.score)
    this.data.set(key, existing)
    return 1
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    if (!zset) return []

    const sorted = Array.from(zset.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(start, stop + 1)
      .map(([member]) => member)

    return sorted
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    return zset?.get(member) || null
  }

  async zcard(key: string): Promise<number | null> {
    const zset = this.data.get(key) as Map<string, number> | undefined
    return zset?.size || 0
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key) ? 1 : 0
    this.data.delete(key)
    return existed
  }

  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    // 簡單模擬衰減
    const key = args[0]
    const factor = parseFloat(args[1])
    const zset = this.data.get(key) as Map<string, number> | undefined

    if (!zset) return 0

    for (const [member] of zset) {
      const score = zset.get(member) || 0
      zset.set(member, score * factor)
    }

    return zset.size
  }

  async clear(): Promise<void> {
    this.data.clear()
  }
}

describe('HotnessTracker', () => {
  let tracker: HotnessTracker
  let redis: MockRedisClient
  let logger: MockLogger

  beforeEach(() => {
    redis = new MockRedisClient()
    logger = new MockLogger()
    tracker = new HotnessTracker(redis as any, logger as any)
  })

  describe('recordAccess', () => {
    it('應該記錄單個商品訪問', async () => {
      await tracker.recordAccess('product-1')

      const hotness = await tracker.getHotness('product-1')
      expect(hotness).toBe(1)
    })

    it('應該增加重複訪問的分數', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-1')

      const hotness = await tracker.getHotness('product-1')
      expect(hotness).toBe(2)
    })

    it('應該追蹤多個商品', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-2')
      await tracker.recordAccess('product-3')

      const hotness1 = await tracker.getHotness('product-1')
      const hotness2 = await tracker.getHotness('product-2')
      const hotness3 = await tracker.getHotness('product-3')

      expect(hotness1).toBe(1)
      expect(hotness2).toBe(1)
      expect(hotness3).toBe(1)
    })
  })

  describe('recordBatchAccess', () => {
    it('應該批量記錄訪問', async () => {
      const productIds = ['product-1', 'product-2', 'product-3']
      await tracker.recordBatchAccess(productIds)

      for (const id of productIds) {
        const hotness = await tracker.getHotness(id)
        expect(hotness).toBe(1)
      }
    })

    it('應該處理空陣列', async () => {
      await tracker.recordBatchAccess([])
      // 應該不拋出錯誤
      expect(true).toBe(true)
    })
  })

  describe('getTopHot', () => {
    it('應該返回空陣列當無數據時', async () => {
      const top = await tracker.getTopHot(10)
      expect(top).toEqual([])
    })

    it('應該返回按熱度排序的前 N 個商品', async () => {
      // 創建測試數據（手動設置分數）
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-1')

      await tracker.recordAccess('product-2')
      await tracker.recordAccess('product-2')

      await tracker.recordAccess('product-3')

      const top3 = await tracker.getTopHot(3)

      expect(top3[0]).toBe('product-1')
      expect(top3[1]).toBe('product-2')
      expect(top3[2]).toBe('product-3')
    })

    it('應該限制結果數量', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-2')
      await tracker.recordAccess('product-3')

      const top2 = await tracker.getTopHot(2)
      expect(top2.length).toBe(2)
    })
  })

  describe('getHotness', () => {
    it('應該返回商品的熱度分數', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-1')

      const hotness = await tracker.getHotness('product-1')
      expect(hotness).toBe(2)
    })

    it('應該返回不存在商品的 0 分', async () => {
      const hotness = await tracker.getHotness('non-existent')
      expect(hotness).toBe(0)
    })
  })

  describe('getStats', () => {
    it('應該返回空統計當無數據時', async () => {
      const stats = await tracker.getStats()

      expect(stats.totalProducts).toBe(0)
      expect(stats.topProduct).toBeNull()
      expect(stats.topScore).toBe(0)
    })

    it('應該返回頂部商品統計', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-2')

      const stats = await tracker.getStats()

      expect(stats.totalProducts).toBe(2)
      expect(stats.topProduct).toBe('product-1')
      expect(stats.topScore).toBe(2)
    })
  })

  describe('reset', () => {
    it('應該清除所有熱度數據', async () => {
      await tracker.recordAccess('product-1')
      await tracker.recordAccess('product-2')

      let stats = await tracker.getStats()
      expect(stats.totalProducts).toBe(2)

      await tracker.reset()

      stats = await tracker.getStats()
      expect(stats.totalProducts).toBe(0)
    })
  })
})
