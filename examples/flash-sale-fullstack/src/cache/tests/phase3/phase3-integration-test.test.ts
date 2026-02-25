/**
 * Phase 3 ObjectPool 與 EventAggregator 集成測試
 *
 * 驗證對象池在實際事件聚合流程中的集成效果
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { EventAggregator } from '../../events/EventAggregator.js'
import { CacheEventType, createCacheEvent, EventSource } from '../../events/types.js'

describe('Phase 3 - ObjectPool Integration', () => {
  let aggregator: EventAggregator

  beforeEach(() => {
    aggregator = new EventAggregator()
  })

  describe('對象池基礎集成', () => {
    it('應該能從池中獲取事件對象', () => {
      const event = aggregator.getEventFromPool()
      expect(event).toBeDefined()
      expect(event).toHaveProperty('id')
    })

    it('應該能將事件對象歸還到池中', () => {
      const event = aggregator.getEventFromPool()
      aggregator.releaseEventToPool(event)

      const stats = aggregator.getPoolStats()
      expect(stats.poolSize).toBeGreaterThan(0)
    })

    it('應該復用歸還的對象', () => {
      const event1 = aggregator.getEventFromPool()
      aggregator.releaseEventToPool(event1)

      const event2 = aggregator.getEventFromPool()
      expect(event2).toBe(event1)
    })
  })

  describe('池統計跟踪', () => {
    it('應該正確報告池的統計信息', () => {
      const stats = aggregator.getPoolStats()

      expect(stats).toHaveProperty('poolSize')
      expect(stats).toHaveProperty('reused')
      expect(stats).toHaveProperty('created')
      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('totalAcquisitions')
      expect(stats).toHaveProperty('maxSize')
    })

    it('應該報告準確的命中率', () => {
      // 獲取 100 個對象
      const events = []
      for (let i = 0; i < 100; i++) {
        events.push(aggregator.getEventFromPool())
      }

      // 歸還前 50 個
      for (let i = 0; i < 50; i++) {
        aggregator.releaseEventToPool(events[i])
      }

      // 再獲取 50 個（其中一些來自池）
      for (let i = 0; i < 50; i++) {
        aggregator.getEventFromPool()
      }

      const stats = aggregator.getPoolStats()

      // 命中率應該大於 0
      expect(stats.hitRate).toBeGreaterThan(0)
      expect(stats.totalAcquisitions).toBe(150)
    })
  })

  describe('與事件提交的集成', () => {
    it('應該在提交事件時保持池的完整性', async () => {
      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:123'])

      const submitted = await aggregator.submit(event)
      expect(submitted).toBe(true)

      // 池應該仍然可用
      const poolEvent = aggregator.getEventFromPool()
      expect(poolEvent).toBeDefined()
    })

    it('應該在提交批量事件時保持池的完整性', async () => {
      const events = [
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1']),
        createCacheEvent(CacheEventType.INVENTORY_CHANGED, ['inventory:1']),
        createCacheEvent(CacheEventType.PRICE_CHANGED, ['price:1']),
      ]

      const accepted = await aggregator.submitBatch(events)
      expect(accepted).toBeGreaterThan(0)

      // 池應該仍然可用
      const poolEvent = aggregator.getEventFromPool()
      expect(poolEvent).toBeDefined()
    })
  })

  describe('清理和重置', () => {
    it('清空聚合器時應該清空池', () => {
      const event = aggregator.getEventFromPool()
      aggregator.releaseEventToPool(event)

      let stats = aggregator.getPoolStats()
      expect(stats.poolSize).toBeGreaterThan(0)

      aggregator.clear()

      stats = aggregator.getPoolStats()
      expect(stats.poolSize).toBe(0)
    })
  })

  describe('高頻操作性能', () => {
    it('應該在高頻獲取/釋放中保持性能', () => {
      const iterations = 10000

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const event = aggregator.getEventFromPool()
        aggregator.releaseEventToPool(event)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 應該在 100ms 內完成 10000 次操作
      expect(duration).toBeLessThan(100)

      const stats = aggregator.getPoolStats()
      expect(stats.hitRate).toBeGreaterThan(50) // 至少 50% 的命中率
    })

    it('應該比直接創建對象快', () => {
      const iterations = 1000

      // 池中的速度
      const startPool = performance.now()
      for (let i = 0; i < iterations; i++) {
        const event = aggregator.getEventFromPool()
        aggregator.releaseEventToPool(event)
      }
      const poolTime = performance.now() - startPool

      // 直接創建的速度
      const startCreate = performance.now()
      for (let i = 0; i < iterations; i++) {
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`])
      }
      const createTime = performance.now() - startCreate

      // 對象池應該快於或等於直接創建
      // (由於重複使用，通常會快很多)
      expect(poolTime).toBeLessThanOrEqual(createTime)
    })
  })

  describe('實際使用場景', () => {
    it('應該支持事件處理流程中的對象復用', async () => {
      aggregator.start()

      try {
        // 模擬事件提交
        const events = []
        for (let i = 0; i < 100; i++) {
          events.push(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
              source: EventSource.API,
            })
          )
        }

        const accepted = await aggregator.submitBatch(events)
        expect(accepted).toBe(100)

        // 獲取一批事件進行處理
        const batch = await aggregator.getNextBatch(50, 100)
        expect(batch.length).toBeGreaterThan(0)

        // 處理完後可以使用池
        const poolEvent = aggregator.getEventFromPool()
        expect(poolEvent).toBeDefined()

        const stats = aggregator.getPoolStats()
        expect(stats).toBeDefined()
      } finally {
        await aggregator.stop()
      }
    })
  })

  describe('邊界情況', () => {
    it('應該安全地處理多次釋放', () => {
      const event = aggregator.getEventFromPool()
      aggregator.releaseEventToPool(event)
      aggregator.releaseEventToPool(event)

      // 不應該拋出錯誤
      const stats = aggregator.getPoolStats()
      expect(stats).toBeDefined()
    })

    it('應該支持池配置更改', () => {
      const event1 = aggregator.getEventFromPool()
      aggregator.releaseEventToPool(event1)

      const statsBefore = aggregator.getPoolStats()
      expect(statsBefore.poolSize).toBeGreaterThan(0)

      // 清空並重新開始
      aggregator.clear()

      const statsAfter = aggregator.getPoolStats()
      expect(statsAfter.poolSize).toBe(0)
    })
  })
})
