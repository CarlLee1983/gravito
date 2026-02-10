/**
 * HotProductTracker 單元測試
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { HotProductTracker } from '../HotProductTracker'

describe('HotProductTracker', () => {
  let tracker: HotProductTracker
  let mockRedisClient: any

  beforeEach(() => {
    // 建立 Mock Redis Client
    mockRedisClient = {
      zscore: mock(async () => null),
      zadd: mock(async () => 1),
      expire: mock(async () => 1),
      zrevrange: mock(async () => []),
      zcard: mock(async () => 0),
      zrange: mock(async () => []),
      zrem: mock(async () => 1),
      zremrangebyscore: mock(async () => 0),
    }

    tracker = new HotProductTracker(mockRedisClient)
  })

  describe('recordView', () => {
    it('應該記錄商品訪問並返回 score', async () => {
      const result = await tracker.recordView('product-1')
      expect(result).toBeGreaterThan(0)
      expect(mockRedisClient.zadd).toHaveBeenCalled()
    })

    it('應該設定過期時間', async () => {
      await tracker.recordView('product-1')
      expect(mockRedisClient.expire).toHaveBeenCalled()
    })

    it('應該在連續訪問時增加計數', async () => {
      // 第一次訪問
      mockRedisClient.zscore = mock(async () => null)
      await tracker.recordView('product-1')

      // 第二次訪問
      mockRedisClient.zscore = mock(async () => 1000.001)
      const result = await tracker.recordView('product-1')

      expect(result).toBeGreaterThan(1000)
    })
  })

  describe('getHeat', () => {
    it('應該返回商品熱度', async () => {
      mockRedisClient.zscore = mock(async () => 1000.005)
      const heat = await tracker.getHeat('product-1')
      expect(heat).toBeGreaterThan(0)
    })

    it('不存在的商品應該返回 0', async () => {
      mockRedisClient.zscore = mock(async () => null)
      const heat = await tracker.getHeat('non-existent')
      expect(heat).toBe(0)
    })
  })

  describe('getTopProducts', () => {
    it('應該返回前 N 個熱銷商品', async () => {
      mockRedisClient.zrevrange = mock(async () => [
        'product-1',
        '1000.005',
        'product-2',
        '999.003',
      ])
      const topProducts = await tracker.getTopProducts(2)

      expect(topProducts.length).toBe(2)
      expect(topProducts[0].productId).toBe('product-1')
      expect(topProducts[0].viewCount).toBeGreaterThan(0)
    })

    it('應該返回空陣列當沒有商品', async () => {
      mockRedisClient.zrevrange = mock(async () => [])
      const topProducts = await tracker.getTopProducts(10)
      expect(topProducts.length).toBe(0)
    })
  })

  describe('shouldWarmup', () => {
    it('熱度超過閾值時應該返回 true', async () => {
      mockRedisClient.zscore = mock(async () => 1000.15)
      const should = await tracker.shouldWarmup('product-1', 100)
      expect(should).toBe(true)
    })

    it('熱度低於閾值時應該返回 false', async () => {
      mockRedisClient.zscore = mock(async () => 1000.05)
      const should = await tracker.shouldWarmup('product-1', 100)
      expect(should).toBe(false)
    })
  })

  describe('resetHeat', () => {
    it('應該移除商品熱度', async () => {
      await tracker.resetHeat('product-1')
      expect(mockRedisClient.zrem).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('應該清理過期數據', async () => {
      mockRedisClient.zremrangebyscore = mock(async () => 5)
      const removed = await tracker.cleanup()
      expect(removed).toBe(5)
    })
  })

  describe('getStats', () => {
    it('應該返回統計信息', async () => {
      mockRedisClient.zcard = mock(async () => 10)
      mockRedisClient.zrevrange = mock(async () => ['product-1', '1000.005'])
      mockRedisClient.zrange = mock(async () => ['product-1', '1000.005', 'product-2', '999.003'])

      const stats = await tracker.getStats()

      expect(stats.totalProducts).toBe(10)
      expect(stats.topProduct).toBeDefined()
      expect(stats.avgHeat).toBeGreaterThan(0)
    })
  })
})
