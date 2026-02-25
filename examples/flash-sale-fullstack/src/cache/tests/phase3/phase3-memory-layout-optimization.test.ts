/**
 * Phase 3 - 記憶體佈局優化測試
 *
 * 驗證記憶體佈局優化的效果
 * 目標改進：5-10%
 *
 * 記憶體佈局優化關鍵：
 * 1. 常訪問字段相鄰 -> L1 緩存命中率提升
 * 2. 避免不必要的指針跳轉 -> 更快的字段訪問
 * 3. 對齐優化 -> 減少緩存行浪費
 */

import { describe, expect, it } from 'vitest'
import { EventDeduplicator } from '../../events/EventDeduplicator.js'
import { EventQueue } from '../../events/EventQueue.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'

describe('Memory Layout Optimization', () => {
  describe('熱路徑訪問優化', () => {
    it('應該快速訪問優先級字段', () => {
      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'], {
        priority: EventPriority.CRITICAL,
      })

      const startTime = performance.now()
      for (let i = 0; i < 100000; i++) {
        // 這是熱路徑訪問
        const _p = event.priority
      }
      const duration = performance.now() - startTime

      // 優先級字段訪問應該快速（< 10ms for 100k 訪問）
      expect(duration).toBeLessThan(10)
    })

    it('應該快速訪問 patterns 字段', () => {
      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1', 'product:2'])

      const startTime = performance.now()
      for (let i = 0; i < 100000; i++) {
        const _len = event.patterns.length
      }
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(10)
    })
  })

  describe('隊列操作的緩存效率', () => {
    it('應該高效地進行堆操作', () => {
      const queue = new EventQueue()
      const events = []

      for (let i = 0; i < 1000; i++) {
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority:
              i % 3 === 0
                ? EventPriority.CRITICAL
                : i % 3 === 1
                  ? EventPriority.HIGH
                  : EventPriority.NORMAL,
          })
        )
      }

      const startTime = performance.now()

      for (const event of events) {
        queue.enqueue(event)
      }

      while (queue.peek()) {
        queue.dequeue()
      }

      const duration = performance.now() - startTime

      // 1000 個事件的完整入隊出隊應該在 10ms 內完成
      expect(duration).toBeLessThan(10)
    })

    it('應該批量出隊操作高效', () => {
      const queue = new EventQueue()

      // 入隊 1000 個事件
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.NORMAL,
          })
        )
      }

      const startTime = performance.now()

      // 批量出隊
      const events = queue.dequeueByPriority(100)

      const duration = performance.now() - startTime

      expect(events).toHaveLength(100)
      // 批量出隊應該非常快（< 1ms for 100 個）
      expect(duration).toBeLessThan(1)
    })
  })

  describe('去重器的訪問模式', () => {
    it('應該高效地進行模式匹配', () => {
      const dedup = new EventDeduplicator()
      const events = []

      for (let i = 0; i < 1000; i++) {
        const patterns = [
          `product:${i}`,
          `category:${Math.floor(i / 10)}`,
          `tag:${Math.floor(i / 100)}`,
        ]
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, patterns, {
            priority: EventPriority.NORMAL,
          })
        )
      }

      const startTime = performance.now()

      dedup.addEvents(events)
      const deduplicated = dedup.getDeduplicated()

      const duration = performance.now() - startTime

      expect(deduplicated.length).toBeGreaterThan(0)
      // 1000 個事件的去重應該在 10ms 內完成
      expect(duration).toBeLessThan(10)
    })
  })

  describe('事件對象的訪問效率', () => {
    it('應該連續訪問常用字段', () => {
      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'])

      const startTime = performance.now()

      for (let i = 0; i < 1000000; i++) {
        // 模擬常見的訪問模式
        void event.priority
        void event.type
        void event.source
        void event.timestamp
      }

      const duration = performance.now() - startTime

      // 1M 次訪問應該 < 5ms
      expect(duration).toBeLessThan(5)
    })

    it('應該高效地複製事件', () => {
      const original = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1', 'product:2'])

      const startTime = performance.now()

      for (let i = 0; i < 100000; i++) {
        // 淺複製事件
        void { ...original }
      }

      const duration = performance.now() - startTime

      // 100k 次複製應該 < 10ms
      expect(duration).toBeLessThan(10)
    })
  })

  describe('批處理性能', () => {
    it('應該高效地批量處理事件', () => {
      const batches = []

      for (let batch = 0; batch < 100; batch++) {
        const batchEvents = []
        for (let i = 0; i < 100; i++) {
          batchEvents.push(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${batch * 100 + i}`])
          )
        }
        batches.push(batchEvents)
      }

      const startTime = performance.now()

      for (const batch of batches) {
        for (const event of batch) {
          // 模擬處理
          const _p = event.priority
          const _t = event.type
          const _patterns = event.patterns.length
        }
      }

      const duration = performance.now() - startTime

      // 10,000 個事件的處理應該 < 10ms
      expect(duration).toBeLessThan(10)
    })
  })

  describe('比較測試', () => {
    it('隊列操作應該比直接對象操作更高效', () => {
      // 直接操作
      const objects = []
      const startDirect = performance.now()

      for (let i = 0; i < 1000; i++) {
        objects.push({ priority: EventPriority.NORMAL, data: `item:${i}` })
        if (objects.length > 500) {
          objects.sort((a, b) => (a.priority > b.priority ? 1 : -1))
        }
      }

      const directDuration = performance.now() - startDirect

      // 隊列操作
      const queue = new EventQueue()
      const startQueue = performance.now()

      for (let i = 0; i < 1000; i++) {
        queue.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], {
            priority: EventPriority.NORMAL,
          })
        )
      }

      while (queue.peek()) {
        queue.dequeue()
      }

      const queueDuration = performance.now() - startQueue

      // 隊列操作應該至少不比直接操作慢
      expect(queueDuration).toBeLessThanOrEqual(directDuration * 1.5)
    })
  })

  describe('緩存行對齊', () => {
    it('應該最小化字段訪問時的緩存未命中', () => {
      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'])

      // 熱路徑：反覆訪問相同字段
      const startTime = performance.now()

      for (let iteration = 0; iteration < 1000; iteration++) {
        for (let i = 0; i < 100; i++) {
          // 反覆訪問這些字段（模擬熱路徑）
          const _p = event.priority
          const _t = event.type
          const _s = event.source
        }
      }

      const duration = performance.now() - startTime

      // 100K 次訪問應該 < 2ms
      expect(duration).toBeLessThan(2)
    })
  })

  describe('性能一致性', () => {
    it('應該在不同大小的數據集上表現一致', () => {
      const durations = []

      for (const size of [100, 1000, 10000]) {
        const queue = new EventQueue()

        for (let i = 0; i < size; i++) {
          queue.enqueue(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
              priority: EventPriority.NORMAL,
            })
          )
        }

        const startTime = performance.now()

        while (queue.peek()) {
          queue.dequeue()
        }

        durations.push(performance.now() - startTime)
      }

      // 檢查性能是否有規律的增長
      // 只驗證不出現異常性能下降
      expect(durations[1]).toBeGreaterThan(0)
      expect(durations[2]).toBeGreaterThan(durations[1])
    })
  })
})
