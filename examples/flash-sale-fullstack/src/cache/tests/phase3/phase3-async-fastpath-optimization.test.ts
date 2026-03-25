/**
 * Phase 3 - 異步快速路徑優化測試
 *
 * 驗證非阻塞異步處理的效果
 * 目標改進：5-10%
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { type AsyncEventPath, createAsyncEventPath } from '../../events/AsyncEventPath.js'
import type { CacheEvent } from '../../events/types.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'

function createTestEvent(id: number, priority: EventPriority = EventPriority.NORMAL): CacheEvent {
  return createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${id}`], {
    priority,
  })
}

describe('AsyncEventPath', () => {
  let asyncPath: AsyncEventPath
  let syncCount = 0

  beforeEach(() => {
    syncCount = 0

    const mockSyncSubmit = async (_event: CacheEvent) => {
      syncCount++
    }

    const mockAsyncSubmit = async (events: CacheEvent[]) => {
      // 異步批量提交
      void events.length
    }

    asyncPath = createAsyncEventPath(mockSyncSubmit, mockAsyncSubmit, {
      asyncThreshold: EventPriority.NORMAL,
      maxAsyncQueueDepth: 1000,
      asyncCheckIntervalMs: 50,
    })
  })

  describe('優先級路由', () => {
    it('應該同步提交高優先級事件', async () => {
      const event = createTestEvent(1, EventPriority.CRITICAL)
      await asyncPath.submit(event)

      expect(syncCount).toBe(1)
    })

    it('應該異步提交低優先級事件', async () => {
      const event = createTestEvent(1, EventPriority.LOW)
      await asyncPath.submit(event)

      // 異步提交不會立即計數
      expect(asyncPath.getAsyncQueueDepth()).toBe(1)
    })

    it('應該異步提交普通優先級事件', async () => {
      const event = createTestEvent(1, EventPriority.NORMAL)
      await asyncPath.submit(event)

      expect(asyncPath.getAsyncQueueDepth()).toBe(1)
    })
  })

  describe('批量提交', () => {
    it('應該批量提交混合優先級事件', async () => {
      const events = [
        createTestEvent(1, EventPriority.CRITICAL),
        createTestEvent(2, EventPriority.NORMAL),
        createTestEvent(3, EventPriority.LOW),
      ]

      await asyncPath.submitBatch(events)

      // CRITICAL 同步，其他異步
      expect(syncCount).toBe(1)
      expect(asyncPath.getAsyncQueueDepth()).toBe(2)
    })
  })

  describe('異步隊列管理', () => {
    it('應該跟踪異步隊列深度', async () => {
      expect(asyncPath.getAsyncQueueDepth()).toBe(0)

      await asyncPath.submit(createTestEvent(1, EventPriority.LOW))
      expect(asyncPath.getAsyncQueueDepth()).toBe(1)

      await asyncPath.submit(createTestEvent(2, EventPriority.LOW))
      expect(asyncPath.getAsyncQueueDepth()).toBe(2)
    })

    it('應該在異步隊列滿時降級為同步', async () => {
      asyncPath = createAsyncEventPath(
        async () => {
          syncCount++
        },
        async () => {
          // 無操作異步提交
        },
        {
          asyncThreshold: EventPriority.LOW,
          maxAsyncQueueDepth: 2,
        }
      )

      for (let i = 0; i < 5; i++) {
        await asyncPath.submit(createTestEvent(i, EventPriority.LOW))
      }

      // 前 2 個異步，後 3 個降級為同步
      expect(asyncPath.getAsyncQueueDepth()).toBeLessThanOrEqual(2)
      expect(syncCount).toBeGreaterThan(0)
    })
  })

  describe('統計跟踪', () => {
    it('應該報告準確的統計信息', async () => {
      await asyncPath.submit(createTestEvent(1, EventPriority.CRITICAL))
      await asyncPath.submit(createTestEvent(2, EventPriority.LOW))
      await asyncPath.submit(createTestEvent(3, EventPriority.LOW))

      const stats = asyncPath.getStats()

      expect(stats.syncSubmitted).toBe(1)
      expect(stats.asyncSubmitted).toBe(2)
      expect(stats.asyncQueueDepth).toBe(2)
      expect(stats.currentThreshold).toBe(EventPriority.NORMAL)
    })
  })

  describe('停止機制', () => {
    it('應該在停止時刷新異步隊列', async () => {
      for (let i = 0; i < 5; i++) {
        await asyncPath.submit(createTestEvent(i, EventPriority.LOW))
      }

      expect(asyncPath.getAsyncQueueDepth()).toBe(5)

      const remaining = await asyncPath.stop()

      expect(remaining).toHaveLength(5)
      expect(asyncPath.getAsyncQueueDepth()).toBe(0)
    })
  })

  describe('性能測試', () => {
    it('應該快速提交高優先級事件', async () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        await asyncPath.submit(createTestEvent(i, EventPriority.CRITICAL))
      }

      const duration = performance.now() - startTime

      // 1000 個高優先級事件應該在 200ms 內提交
      expect(duration).toBeLessThan(200)
      expect(syncCount).toBe(1000)
    })

    it('應該非阻塞地提交低優先級事件', async () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        await asyncPath.submit(createTestEvent(i, EventPriority.LOW))
      }

      const duration = performance.now() - startTime

      // 異步提交應該非常快（< 50ms）
      expect(duration).toBeLessThan(50)
      expect(asyncPath.getAsyncQueueDepth()).toBe(1000)
    })
  })

  describe('配置調整', () => {
    it('應該支持動態調整優先級閾值', async () => {
      // 初始閾值：NORMAL
      await asyncPath.submit(createTestEvent(1, EventPriority.NORMAL))
      expect(asyncPath.getAsyncQueueDepth()).toBe(1)

      // 改為 LOW，NORMAL 變同步
      asyncPath.setAsyncThreshold(EventPriority.LOW)
      await asyncPath.submit(createTestEvent(2, EventPriority.NORMAL))
      expect(syncCount).toBe(1)
    })
  })

  describe('邊界情況', () => {
    it('應該在空隊列上安全停止', async () => {
      const remaining = await asyncPath.stop()
      expect(remaining).toEqual([])
    })

    it('應該支持 0 延遲異步隊列', async () => {
      const zeroLatencyPath = createAsyncEventPath(
        async () => {
          syncCount++
        },
        async (events) => {
          // 異步批量提交
          void events.length
        },
        {
          asyncCheckIntervalMs: 0,
        }
      )

      for (let i = 0; i < 10; i++) {
        await zeroLatencyPath.submit(createTestEvent(i, EventPriority.LOW))
      }

      // 即使是 0 延遲，也可能需要最小的異步時間
      await new Promise((resolve) => setTimeout(resolve, 10))
      await zeroLatencyPath.stop()
    })
  })
})
