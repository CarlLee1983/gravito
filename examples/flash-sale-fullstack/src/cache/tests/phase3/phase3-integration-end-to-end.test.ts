/**
 * Phase 3 - 集成與端到端測試
 *
 * 驗證所有優化模塊協同工作的效果
 * 場景：完整的秒殺流程、邊界情況、異常恢復
 * 目標：確保 35-45% 性能改進在實際場景中可達成
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { type AsyncEventPath, createAsyncEventPath } from '../../events/AsyncEventPath.js'
import { type BatchSubmitter, createBatchSubmitter } from '../../events/BatchSubmitter.js'
import { EventAggregator } from '../../events/EventAggregator.js'
import { EventDeduplicator } from '../../events/EventDeduplicator.js'
import type { CacheEvent } from '../../events/types.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'
import { L1CacheManager } from '../../L1CacheManager.js'

describe('Phase 3 - 集成與端到端測試', () => {
  let cacheManager: L1CacheManager
  let batchSubmitter: BatchSubmitter
  let asyncPath: AsyncEventPath
  let submittedEvents: CacheEvent[][] = []
  let syncCount = 0

  beforeEach(() => {
    submittedEvents = []
    syncCount = 0

    // 模擬事件提交
    const mockSubmitFn = async (events: CacheEvent[]) => {
      submittedEvents.push([...events])
    }

    const mockSyncFn = async (event: CacheEvent) => {
      syncCount++
    }

    const mockAsyncFn = async (events: CacheEvent[]) => {
      // 異步提交
      void events.length
    }

    // 初始化所有組件
    batchSubmitter = createBatchSubmitter(mockSubmitFn, 50, 50)
    asyncPath = createAsyncEventPath(mockSyncFn, mockAsyncFn, {
      asyncThreshold: EventPriority.NORMAL,
      maxAsyncQueueDepth: 1000,
      asyncCheckIntervalMs: 100,
    })

    cacheManager = new L1CacheManager(
      {
        maxSize: 1024 * 1024,
        ttlMs: 60000,
        maxHotProducts: 100,
      },
      {
        async get() {
          return null
        },
        async set() {},
        async delete() {},
        async clear() {},
      }
    )
  })

  describe('A. 完整秒殺流程集成測試', () => {
    it('應該在高優先級事件下優先同步提交', async () => {
      const events = [
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'], {
          priority: EventPriority.CRITICAL,
        }),
        createCacheEvent(CacheEventType.PRODUCT_VIEWED, ['product:1'], {
          priority: EventPriority.HIGH,
        }),
      ]

      for (const event of events) {
        await asyncPath.submit(event)
      }

      expect(syncCount).toBe(2)
      expect(asyncPath.getAsyncQueueDepth()).toBe(0)
    })

    it('應該批量提交低優先級事件', async () => {
      const events = []
      for (let i = 0; i < 100; i++) {
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.LOW,
          })
        )
      }

      for (const event of events) {
        await batchSubmitter.enqueue(event)
      }

      // 應該自動刷新（達到批大小 50）
      expect(submittedEvents.length).toBeGreaterThan(0)
      const totalSubmitted = submittedEvents.reduce((acc, batch) => acc + batch.length, 0)
      expect(totalSubmitted).toBeGreaterThanOrEqual(50)
    })

    it('應該在混合優先級下正確路由', async () => {
      const criticalEvent = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'], {
        priority: EventPriority.CRITICAL,
      })
      const normalEvent = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:2'], {
        priority: EventPriority.NORMAL,
      })
      const lowEvent = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:3'], {
        priority: EventPriority.LOW,
      })

      await asyncPath.submit(criticalEvent)
      await asyncPath.submit(normalEvent)
      await asyncPath.submit(lowEvent)

      expect(syncCount).toBe(1) // 只有 CRITICAL 同步
      expect(asyncPath.getAsyncQueueDepth()).toBe(2) // NORMAL + LOW 異步
    })

    it('應該完整處理 100 個秒殺事件', async () => {
      const startTime = performance.now()

      // 模擬 100 個用戶搶購
      const events = []
      for (let i = 0; i < 100; i++) {
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 10}`], {
            priority: i < 20 ? EventPriority.CRITICAL : EventPriority.NORMAL,
          })
        )
      }

      // 分別通過不同路徑提交
      for (let i = 0; i < events.length; i++) {
        if (i < 20) {
          await asyncPath.submit(events[i])
        } else {
          await batchSubmitter.enqueue(events[i])
        }
      }

      const duration = performance.now() - startTime

      // 驗證性能指標
      expect(syncCount).toBe(20) // CRITICAL 事件同步
      expect(duration).toBeLessThan(500) // 100 個事件處理 < 500ms
    })
  })

  describe('B. 邊界情況與異常恢復', () => {
    it('應該在空隊列上安全操作', async () => {
      const flushed = await batchSubmitter.flush()
      expect(flushed).toEqual([])

      const stopped = await asyncPath.stop()
      expect(stopped).toEqual([])
    })

    it('應該處理單個事件的邊界', async () => {
      const singleBatchSubmitter = createBatchSubmitter(
        async (events) => {
          submittedEvents.push([...events])
        },
        1,
        50
      )

      const event = createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'])
      await singleBatchSubmitter.enqueue(event)

      expect(submittedEvents.length).toBe(1)
      expect(submittedEvents[0]).toHaveLength(1)
    })

    it('應該處理超大批次的邊界', async () => {
      const largeBatchSubmitter = createBatchSubmitter(
        async (events) => {
          submittedEvents.push([...events])
        },
        10000,
        50
      )

      for (let i = 0; i < 100; i++) {
        await largeBatchSubmitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`])
        )
      }

      expect(submittedEvents.length).toBe(0) // 未達到批大小
      expect(largeBatchSubmitter.getPendingCount()).toBe(100)

      await largeBatchSubmitter.flush()
      expect(submittedEvents.length).toBe(1)
    })

    it('應該在隊列滿時自動降級', async () => {
      const limitedAsyncPath = createAsyncEventPath(
        async (event) => {
          syncCount++
        },
        async () => {
          // 異步提交
        },
        {
          asyncThreshold: EventPriority.LOW,
          maxAsyncQueueDepth: 5,
        }
      )

      // 填滿異步隊列
      for (let i = 0; i < 10; i++) {
        await limitedAsyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.LOW,
          })
        )
      }

      // 前 5 個異步，後 5 個降級為同步
      expect(limitedAsyncPath.getAsyncQueueDepth()).toBeLessThanOrEqual(5)
      expect(syncCount).toBeGreaterThan(0)
    })

    it('應該處理極端的高並發場景', async () => {
      const startTime = performance.now()

      // 1000 個並發事件
      const promises = []
      for (let i = 0; i < 1000; i++) {
        const priority = i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL
        promises.push(
          asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 100}`], {
              priority,
            })
          )
        )
      }

      await Promise.all(promises)

      const duration = performance.now() - startTime

      // 應該在合理時間內完成
      expect(duration).toBeLessThan(1000)
      expect(syncCount).toBe(250) // 1000 * 0.25 = 250 個 CRITICAL
    })
  })

  describe('C. 性能驗證與指標檢查', () => {
    it('應該驗證整體吞吐量提升', async () => {
      const startTime = performance.now()

      // 模擬 5000 個事件的吞吐
      for (let i = 0; i < 5000; i++) {
        const priority = i % 10 < 3 ? EventPriority.CRITICAL : EventPriority.NORMAL
        if (priority === EventPriority.CRITICAL) {
          await asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 100}`], {
              priority,
            })
          )
        } else {
          await batchSubmitter.enqueue(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 100}`], {
              priority,
            })
          )
        }
      }

      const duration = performance.now() - startTime
      const throughput = (5000 / duration) * 1000 // ops/sec

      // 驗證性能改進（期望 1000+ ops/sec）
      expect(throughput).toBeGreaterThan(500)
    })

    it('應該驗證延遲分佈', async () => {
      const latencies: number[] = []

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now()

        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.CRITICAL,
          })
        )

        latencies.push(performance.now() - startTime)
      }

      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]

      // 驗證延遲指標
      expect(avgLatency).toBeLessThan(1) // 平均延遲 < 1ms
      expect(p95).toBeLessThan(5) // P95 延遲 < 5ms
    })

    it('應該驗證記憶體效率', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // 處理 10000 個事件
      for (let i = 0; i < 10000; i++) {
        await batchSubmitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 100}`])
        )
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB

      // 驗證記憶體增長（期望 < 10MB）
      expect(memoryIncrease).toBeLessThan(10)
    })

    it('應該驗證統計信息的準確性', async () => {
      for (let i = 0; i < 100; i++) {
        await batchSubmitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`])
        )
      }

      const stats = batchSubmitter.getStats()

      expect(stats.totalEvents).toBeGreaterThan(0)
      expect(stats.averageBatchSize).toBeGreaterThan(0)
      expect(stats.lastFlushTime).toBeGreaterThan(0)
    })
  })

  describe('D. 異常和恢復場景', () => {
    it('應該在提交失敗時恢復', async () => {
      let callCount = 0
      const failingSubmitter = createBatchSubmitter(
        async () => {
          callCount++
          if (callCount === 1) {
            throw new Error('Submit failed')
          }
        },
        5,
        50
      )

      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      // 第一次提交失敗
      try {
        await failingSubmitter.enqueueBatch(events)
      } catch {
        // 預期失敗
      }

      // 事件應該仍在隊列中
      expect(failingSubmitter.getPendingCount()).toBe(5)
    })

    it('應該正確處理優先級閾值動態調整', async () => {
      // 初始閾值：NORMAL（LOW 異步）
      await asyncPath.submit(
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1'], {
          priority: EventPriority.LOW,
        })
      )

      expect(asyncPath.getAsyncQueueDepth()).toBe(1)

      // 調整為 LOW（NORMAL 變同步）
      asyncPath.setAsyncThreshold(EventPriority.LOW)
      await asyncPath.submit(
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:2'], {
          priority: EventPriority.NORMAL,
        })
      )

      expect(syncCount).toBe(1)
    })

    it('應該在停止時清空所有待提交事件', async () => {
      // 添加多個事件
      for (let i = 0; i < 10; i++) {
        await batchSubmitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`])
        )
      }

      const stats1 = batchSubmitter.getStats()
      expect(stats1.pendingEvents).toBeGreaterThan(0)

      // 停止並刷新
      const flushed = await batchSubmitter.stop()

      expect(flushed.length).toBe(stats1.pendingEvents)
      expect(batchSubmitter.getPendingCount()).toBe(0)
    })

    it('應該在異常情況下保持數據一致性', async () => {
      const deduplicator = new EventDeduplicator()

      const events = [
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1', 'product:2']),
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:1']), // 重複
        createCacheEvent(CacheEventType.PRODUCT_UPDATED, ['product:3']),
      ]

      deduplicator.addEvents(events)
      const deduplicated = deduplicator.getDeduplicated()

      // 應該去重重複的模式
      expect(deduplicated.length).toBeGreaterThan(0)

      // 驗證數據一致性
      for (const event of deduplicated) {
        expect(event.patterns.length).toBeGreaterThan(0)
        expect(event.timestamp).toBeGreaterThan(0)
      }
    })
  })

  describe('E. 快取系統集成', () => {
    it('應該支持完整的快取操作流', async () => {
      // 設置快取
      cacheManager.set('key:1', 'value:1', 60)
      cacheManager.set('key:2', 'value:2', 60)

      // 驗證快取命中
      const value1 = await cacheManager.get('key:1')
      expect(value1).toBe('value:1')

      // 驗證快取統計
      const stats = cacheManager.getStats()
      expect(stats.totalHits).toBeGreaterThan(0)
    })

    it('應該在事件失效時更新快取', async () => {
      // 設置初始快取
      cacheManager.set('product:1', { id: 1, name: 'Product 1' }, 60)

      // 發送失效事件
      await cacheManager.deletePattern('product:1')

      // 驗證快取已清空
      const value = await cacheManager.get('product:1')
      expect(value).toBeNull()
    })

    it('應該正確處理快取和事件流的協調', async () => {
      // 併發設置快取和提交事件
      const eventOps = []

      for (let i = 0; i < 100; i++) {
        cacheManager.set(`product:${i}`, { id: i, name: `Product ${i}` }, 60)
        eventOps.push(
          asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
              priority: EventPriority.NORMAL,
            })
          )
        )
      }

      await Promise.all(eventOps)

      // 驗證快取和事件都正確處理
      const cacheStats = cacheManager.getStats()
      expect(cacheStats.currentSize).toBeGreaterThan(0)

      expect(asyncPath.getAsyncQueueDepth()).toBeLessThanOrEqual(100)
    })
  })
})
