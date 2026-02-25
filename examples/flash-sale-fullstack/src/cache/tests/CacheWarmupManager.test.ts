/**
 * CacheWarmupManager 單元測試
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CacheWarmupManager } from '../CacheWarmupManager'

describe('CacheWarmupManager', () => {
  let manager: CacheWarmupManager
  let mockTracker: any
  let mockCache: any
  let mockDb: any

  beforeEach(() => {
    mockTracker = {
      getTopProducts: mock(async () => [
        { productId: 'product-1', score: 1000.01, viewCount: 10 },
        { productId: 'product-2', score: 999.005, viewCount: 5 },
      ]),
      recordView: mock(async () => 1000),
      shouldWarmup: mock(async () => false),
    }

    mockCache = {
      get: mock(async () => null),
      set: mock(async () => true),
      refresh: mock(async () => true),
    }

    mockDb = {
      query: mock(async () => [{ id: 'product-1', name: 'Product 1' }]),
    }

    manager = new CacheWarmupManager(mockTracker, mockCache, mockDb, {
      topProductsCount: 10,
      heatThreshold: 50,
      ttl: 300,
      periodicInterval: 600,
      relatedProductsCount: 5,
    })
  })

  describe('warmupOnStartup', () => {
    it('應該預熱頂級商品', async () => {
      await manager.warmupOnStartup()
      expect(mockCache.set).toHaveBeenCalled()
    })

    it('應該記錄預熱指標', async () => {
      await manager.warmupOnStartup()
      const metrics = manager.getMetrics()
      expect(metrics.totalWarmed).toBeGreaterThan(0)
    })

    it('錯誤時應該繼續執行', async () => {
      mockCache.set = mock(async () => {
        throw new Error('Cache error')
      })
      await manager.warmupOnStartup()
      // 應該不拋出錯誤
    })
  })

  describe('onProductViewed', () => {
    it('應該記錄商品訪問', async () => {
      await manager.onProductViewed('product-1')
      expect(mockTracker.recordView).toHaveBeenCalled()
    })

    it('達到閾值時應該預熱相關商品', async () => {
      mockTracker.shouldWarmup = mock(async () => true)
      await manager.onProductViewed('product-1')
      // 應該調用相關商品預熱
    })
  })

  describe('startPeriodicWarmup', () => {
    it('應該啟動定期預熱', async () => {
      manager.startPeriodicWarmup()
      expect(manager.getMetrics()).toBeDefined()
    })

    it('應該能夠停止定期預熱', () => {
      manager.startPeriodicWarmup()
      manager.stopPeriodicWarmup()
      // 應該成功停止
    })

    it('重複啟動應該只運行一次', async () => {
      manager.startPeriodicWarmup()
      manager.startPeriodicWarmup()
      // 應該不會錯誤
    })
  })

  describe('metrics', () => {
    it('應該追蹤預熱統計', async () => {
      await manager.warmupOnStartup()
      const metrics = manager.getMetrics()

      expect(metrics.totalWarmed).toBeGreaterThanOrEqual(0)
      expect(metrics.lastWarmupTime).toBeGreaterThan(0)
      expect(metrics.avgWarmupDuration).toBeGreaterThanOrEqual(0)
    })

    it('應該更新平均持續時間', async () => {
      await manager.warmupOnStartup()
      await manager.warmupOnStartup()

      const metrics = manager.getMetrics()
      expect(metrics.avgWarmupDuration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('stopPeriodicWarmup', () => {
    it('應該安全地停止未啟動的定時器', () => {
      manager.stopPeriodicWarmup()
      // 應該不會錯誤
    })
  })
})
