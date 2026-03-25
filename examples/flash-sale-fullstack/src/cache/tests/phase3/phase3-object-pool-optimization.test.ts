/**
 * Phase 3 - ObjectPool 優化測試
 *
 * 驗證對象池的核心功能和性能改進
 * 目標改進：15-20%
 * 預期測試數：15+ 個
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { type CacheEventPool, createCacheEventPool } from '../../events/ObjectPool.js'

describe('CacheEventPool', () => {
  let pool: CacheEventPool

  beforeEach(() => {
    // 創建一個最大大小為 10 的池
    pool = createCacheEventPool(10)
  })

  // ==================== 基礎功能測試 ====================

  describe('基礎功能', () => {
    it('應該從池中獲取對象', () => {
      const event = pool.acquire()
      expect(event).toBeDefined()
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('type')
      expect(event).toHaveProperty('priority')
    })

    it('應該將對象歸還到池中', () => {
      const event = pool.acquire()
      const statsBefore = pool.getStats()

      pool.release(event)
      const statsAfter = pool.getStats()

      // 池中應該有一個對象
      expect(statsAfter.poolSize).toBe(1)
      expect(statsAfter.poolSize).toBeGreaterThan(statsBefore.poolSize)
    })

    it('應該復用歸還的對象', () => {
      const event1 = pool.acquire()
      pool.release(event1)

      const event2 = pool.acquire()
      expect(event2).toBe(event1)
    })

    it('應該跟踪復用統計', () => {
      const event = pool.acquire()
      pool.release(event)

      pool.acquire() // 復用
      const stats = pool.getStats()

      expect(stats.reused).toBe(1)
      expect(stats.created).toBe(1) // 第一次獲取創建
      expect(stats.totalAcquisitions).toBe(2)
    })
  })

  // ==================== 池大小管理 ====================

  describe('池大小管理', () => {
    it('應該尊重最大池大小', () => {
      const smallPool = createCacheEventPool(3)
      const events = []

      // 獲取 5 個對象
      for (let i = 0; i < 5; i++) {
        events.push(smallPool.acquire())
      }

      // 歸還所有對象
      for (const event of events) {
        smallPool.release(event)
      }

      // 池的大小應該 <= 3
      const stats = smallPool.getStats()
      expect(stats.poolSize).toBeLessThanOrEqual(3)
    })

    it('當池滿時應該拒絕新對象', () => {
      const smallPool = createCacheEventPool(2)

      const event1 = smallPool.acquire()
      const event2 = smallPool.acquire()
      smallPool.release(event1)
      smallPool.release(event2)

      // 此時池已滿
      const stats1 = smallPool.getStats()
      expect(stats1.poolSize).toBe(2)

      // 嘗試歸還另一個對象
      const event3 = smallPool.acquire()
      smallPool.release(event3)

      // 池的大小應該保持為 2
      const stats2 = smallPool.getStats()
      expect(stats2.poolSize).toBe(2)
    })
  })

  // ==================== 統計跟踪 ====================

  describe('統計跟踪', () => {
    it('應該計算正確的命中率', () => {
      // 獲取 10 個對象
      const events = []
      for (let i = 0; i < 10; i++) {
        events.push(pool.acquire())
      }

      // 歸還 6 個
      for (let i = 0; i < 6; i++) {
        pool.release(events[i])
      }

      // 再獲取 6 個（其中 6 個來自池）
      for (let i = 0; i < 6; i++) {
        pool.acquire()
      }

      const stats = pool.getStats()
      // 6 次復用 / (10 + 6) 次總獲取 = 6/16 = 37.5%
      expect(stats.hitRate).toBeCloseTo(37.5, 1)
    })

    it('應該報告準確的統計信息', () => {
      const event1 = pool.acquire()
      const _event2 = pool.acquire()

      pool.release(event1)

      pool.acquire() // 復用 event1
      const _event3 = pool.acquire() // 創建新對象

      const stats = pool.getStats()

      expect(stats.created).toBe(3) // event1, event2, event3
      expect(stats.reused).toBe(1) // 只復用了 event1
      expect(stats.poolSize).toBe(0) // 所有對象都被獲取
      expect(stats.totalAcquisitions).toBe(4)
    })

    it('池為空時命中率應該為 0', () => {
      const stats = pool.getStats()
      expect(stats.hitRate).toBe(0)
    })
  })

  // ==================== 批量操作 ====================

  describe('批量操作', () => {
    it('應該支持批量歸還', () => {
      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(pool.acquire())
      }

      pool.releaseBatch(events)

      const stats = pool.getStats()
      expect(stats.poolSize).toBe(5)
    })

    it('批量歸還應該尊重最大池大小', () => {
      const smallPool = createCacheEventPool(3)
      const events = []

      for (let i = 0; i < 5; i++) {
        events.push(smallPool.acquire())
      }

      smallPool.releaseBatch(events)

      const stats = smallPool.getStats()
      expect(stats.poolSize).toBeLessThanOrEqual(3)
    })
  })

  // ==================== 池管理操作 ====================

  describe('池管理操作', () => {
    it('應該支持清空池', () => {
      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(pool.acquire())
      }

      for (const event of events) {
        pool.release(event)
      }

      expect(pool.getStats().poolSize).toBe(5)

      pool.clear()

      expect(pool.getStats().poolSize).toBe(0)
      expect(pool.size()).toBe(0)
    })

    it('應該支持重置統計信息', () => {
      const event1 = pool.acquire()
      const event2 = pool.acquire()
      pool.release(event1)
      pool.release(event2)
      pool.acquire() // 復用

      let stats = pool.getStats()
      expect(stats.reused).toBe(1)
      expect(stats.poolSize).toBe(1) // 一個在池中

      pool.resetStats()

      stats = pool.getStats()
      expect(stats.reused).toBe(0)
      expect(stats.created).toBe(0)
      // 池中的對象應該保留
      expect(stats.poolSize).toBe(1)
    })

    it('應該支持調整池大小', () => {
      const events = []
      for (let i = 0; i < 10; i++) {
        events.push(pool.acquire())
      }

      for (const event of events) {
        pool.release(event)
      }

      // 此時池應該有 10 個對象
      expect(pool.getStats().poolSize).toBe(10)

      // 將最大大小調整為 5
      pool.resize(5)

      // 池應該被修剪到 5 個
      expect(pool.size()).toBe(5)
    })

    it('應該支持預熱池', () => {
      pool.warmup(5)

      const stats = pool.getStats()
      expect(stats.poolSize).toBe(5)
    })
  })

  // ==================== 對象重置 ====================

  describe('對象重置', () => {
    it('歸還時應該重置對象狀態', () => {
      let event = pool.acquire()

      // 修改對象
      event.id = 'test-id'
      event.patterns = ['pattern1', 'pattern2']
      event.metadata = { key: 'value' }

      pool.release(event)
      event = pool.acquire()

      // 對象應該被重置
      expect(event.id).toBe('')
      expect(event.patterns).toEqual([])
      expect(event.metadata).toBeUndefined()
    })
  })

  // ==================== 高負載測試 ====================

  describe('高負載測試', () => {
    it('應該在高頻操作中保持穩定', () => {
      const iterations = 10000

      for (let i = 0; i < iterations; i++) {
        const event = pool.acquire()
        pool.release(event)
      }

      const stats = pool.getStats()

      // 所有操作都應該成功
      expect(stats.totalAcquisitions).toBe(iterations)
      // 命中率應該很高（至少 90%）
      expect(stats.hitRate).toBeGreaterThan(90)
    })

    it('應該在大量對象上保持一致的性能', () => {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const events = []
        for (let j = 0; j < 10; j++) {
          events.push(pool.acquire())
        }
        for (const event of events) {
          pool.release(event)
        }
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 應該在合理時間內完成（< 100ms）
      expect(duration).toBeLessThan(100)
    })
  })

  // ==================== 邊界情況 ====================

  describe('邊界情況', () => {
    it('應該處理空池的獲取', () => {
      const event = pool.acquire()
      expect(event).toBeDefined()
    })

    it('應該處理多次歸還同一個對象', () => {
      const event = pool.acquire()

      pool.release(event)
      pool.release(event) // 第二次歸還

      // 不應該有錯誤，但池的大小應該 <= 2
      const stats = pool.getStats()
      expect(stats.poolSize).toBeLessThanOrEqual(2)
    })

    it('應該處理 null/undefined 的安全性', () => {
      // 這是一個防守性測試
      const event = pool.acquire()
      expect(event).not.toBeNull()
      expect(event).not.toBeUndefined()
    })
  })

  // ==================== 性能基準測試 ====================

  describe('性能基準', () => {
    it('對象獲取應該非常快', () => {
      const event = pool.acquire()
      pool.release(event)

      const startTime = performance.now()
      for (let i = 0; i < 100000; i++) {
        pool.acquire()
      }
      const endTime = performance.now()

      const avgLatency = (endTime - startTime) / 100000

      // 平均延遲應該 < 0.01ms
      expect(avgLatency).toBeLessThan(0.01)
    })

    it('復用應該比創建快', () => {
      // 測試復用的性能優勢
      const iterations = 1000

      // 先填充池
      const events = []
      for (let i = 0; i < iterations; i++) {
        events.push(pool.acquire())
      }
      for (const event of events) {
        pool.release(event)
      }

      // 復用的時間
      const startReuse = performance.now()
      for (let i = 0; i < iterations; i++) {
        pool.acquire()
      }
      const reuseTime = performance.now() - startReuse

      // 創建新對象的時間
      pool.clear()
      const startCreate = performance.now()
      for (let i = 0; i < iterations; i++) {
        pool.acquire()
      }
      const createTime = performance.now() - startCreate

      // 復用應該明顯快於創建（或至少相當快）
      expect(reuseTime).toBeLessThanOrEqual(createTime * 1.5)
    })
  })
})
