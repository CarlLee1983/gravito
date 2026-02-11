/**
 * Phase 3 - 邊界與壓力測試
 *
 * 驗證系統在極端情況下的表現
 * 場景：高並發、大數據、深隊列、長時間運行
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { AsyncEventPath, createAsyncEventPath } from '../../events/AsyncEventPath.js'
import { BatchSubmitter, createBatchSubmitter } from '../../events/BatchSubmitter.js'
import { EventDeduplicator } from '../../events/EventDeduplicator.js'
import { EventQueue } from '../../events/EventQueue.js'
import type { CacheEvent } from '../../events/types.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'

describe('Phase 3 - 邊界與壓力測試', () => {
  describe('A. 極限並發測試', () => {
    it('應該處理 10000 個並發事件', async () => {
      const submittedEvents: CacheEvent[][] = []
      const submitter = createBatchSubmitter(
        async (events) => {
          submittedEvents.push([...events])
        },
        100,
        50
      )

      const startTime = performance.now()

      // 併發提交 10000 個事件
      const promises = []
      for (let i = 0; i < 10000; i++) {
        promises.push(
          submitter.enqueue(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i % 1000}`])
          )
        )
      }

      await Promise.all(promises)
      await submitter.stop()

      const duration = performance.now() - startTime
      const totalEvents = submittedEvents.reduce((acc, batch) => acc + batch.length, 0)

      expect(totalEvents).toBeGreaterThanOrEqual(10000)
      expect(duration).toBeLessThan(5000) // 完成時間 < 5 秒
    })

    it('應該在高並發優先級路由下保持穩定', async () => {
      let syncCount = 0
      let asyncCount = 0

      const asyncPath = createAsyncEventPath(
        async () => {
          syncCount++
        },
        async (events) => {
          asyncCount += events.length
        },
        {
          asyncThreshold: EventPriority.NORMAL,
          maxAsyncQueueDepth: 10000,
        }
      )

      const startTime = performance.now()

      // 5000 個並發混合優先級事件
      const promises = []
      for (let i = 0; i < 5000; i++) {
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
      await asyncPath.stop()

      const duration = performance.now() - startTime

      expect(syncCount).toBe(1250) // 5000 * 0.25 = 1250
      expect(asyncCount).toBeLessThanOrEqual(3750) // 剩餘的異步
      expect(duration).toBeLessThan(2000)
    })

    it('應該在 1000 個並發異步提交下非阻塞', async () => {
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步提交
        },
        async (events) => {
          // 異步提交
          void events.length
        },
        {
          asyncThreshold: EventPriority.LOW,
          maxAsyncQueueDepth: 5000,
        }
      )

      const startTime = performance.now()

      // 1000 個異步事件併發提交（應該非常快）
      const promises = []
      for (let i = 0; i < 1000; i++) {
        promises.push(
          asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
              priority: EventPriority.LOW,
            })
          )
        )
      }

      const preWaitTime = performance.now() - startTime

      await Promise.all(promises)

      const totalTime = performance.now() - startTime

      // 預期異步提交應該非常快（不到 100ms）
      expect(preWaitTime).toBeLessThan(100)
      expect(totalTime).toBeLessThan(500)
    })
  })

  describe('B. 大規模數據處理', () => {
    it('應該高效去重 10000 個事件', () => {
      const deduplicator = new EventDeduplicator()

      const events = []
      for (let i = 0; i < 10000; i++) {
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [
            `product:${i % 100}`,
            `category:${i % 10}`,
          ])
        )
      }

      const startTime = performance.now()

      deduplicator.addEvents(events)
      const deduplicated = deduplicator.getDeduplicated()

      const duration = performance.now() - startTime

      expect(deduplicated.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(100) // 去重應該快速
    })

    it('應該正確處理大批次提交', async () => {
      const submitter = createBatchSubmitter(
        async () => {
          // 批次提交
        },
        5000, // 大批大小
        1000 // 長刷新間隔
      )

      // 提交 20000 個事件（會分成多個批次）
      for (let i = 0; i < 20000; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`]))
      }

      const stats = submitter.getStats()
      expect(stats.totalEvents).toBeGreaterThanOrEqual(5000) // 至少一個完整批
    })

    it('應該在深隊列中保持性能', async () => {
      const queue = new EventQueue()

      // 填充深隊列（1000 個不同優先級的事件）
      for (let i = 0; i < 1000; i++) {
        const priority = i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL
        queue.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], { priority })
        )
      }

      const startTime = performance.now()

      // 批量出隊
      let dequeuedCount = 0
      while (queue.peek()) {
        queue.dequeue()
        dequeuedCount++
      }

      const duration = performance.now() - startTime

      expect(dequeuedCount).toBe(1000)
      expect(duration).toBeLessThan(50) // 快速出隊
    })
  })

  describe('C. 邊界值測試', () => {
    it('應該處理空批次提交', async () => {
      let callCount = 0

      const submitter = createBatchSubmitter(
        async () => {
          callCount++
        },
        10,
        50
      )

      const flushed = await submitter.flush()
      expect(flushed).toEqual([])
      expect(callCount).toBe(0)
    })

    it('應該處理批大小為 1 的情況', async () => {
      let batchCount = 0
      let totalEvents = 0

      const submitter = createBatchSubmitter(
        async (events) => {
          batchCount++
          totalEvents += events.length
        },
        1,
        1000
      )

      for (let i = 0; i < 100; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      expect(batchCount).toBeGreaterThanOrEqual(100)
      expect(totalEvents).toBeGreaterThanOrEqual(100)
    })

    it('應該處理異常大的批大小', async () => {
      let callCount = 0

      const submitter = createBatchSubmitter(
        async () => {
          callCount++
        },
        100000, // 非常大的批大小
        50
      )

      // 提交只有 10 個事件（遠小於批大小）
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      expect(callCount).toBe(0) // 還沒達到批大小，不應提交
      expect(submitter.getPendingCount()).toBe(10)

      await submitter.flush()
      expect(callCount).toBe(1)
    })

    it('應該正確處理 0 延遲異步隊列', async () => {
      let asyncCount = 0

      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步提交
        },
        async (events) => {
          asyncCount += events.length
        },
        {
          asyncCheckIntervalMs: 0, // 0 延遲
          maxAsyncQueueDepth: 1000,
        }
      )

      for (let i = 0; i < 100; i++) {
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.LOW,
          })
        )
      }

      // 即使是 0 延遲，也可能需要最小的異步時間
      await new Promise((resolve) => setTimeout(resolve, 50))
      await asyncPath.stop()

      expect(asyncCount).toBeLessThanOrEqual(100)
    })
  })

  describe('D. 長時間運行穩定性', () => {
    it('應該在 100 次迭代中保持穩定性', async () => {
      const submitter = createBatchSubmitter(
        async () => {
          // 提交操作
        },
        50,
        50
      )

      const statsList = []

      for (let iteration = 0; iteration < 100; iteration++) {
        for (let i = 0; i < 100; i++) {
          await submitter.enqueue(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${iteration}-${i}`])
          )
        }

        if (iteration % 20 === 0) {
          statsList.push(submitter.getStats())
        }
      }

      // 驗證統計信息的一致性
      for (let i = 1; i < statsList.length; i++) {
        expect(statsList[i].totalBatches).toBeGreaterThanOrEqual(statsList[i - 1].totalBatches)
        expect(statsList[i].totalEvents).toBeGreaterThanOrEqual(statsList[i - 1].totalEvents)
      }
    })

    it('應該在重複優先級調整中保持一致', async () => {
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步提交
        },
        async () => {
          // 異步提交
        }
      )

      const priorities = [EventPriority.CRITICAL, EventPriority.NORMAL, EventPriority.LOW]

      for (let round = 0; round < 50; round++) {
        const threshold = priorities[round % 3]
        asyncPath.setAsyncThreshold(threshold)

        // 提交不同優先級的事件
        for (let i = 0; i < 10; i++) {
          await asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
              priority: priorities[i % 3],
            })
          )
        }
      }

      const stats = asyncPath.getStats()
      expect(stats.syncSubmitted + stats.asyncSubmitted).toBeGreaterThan(0)
    })

    it('應該正確恢復堆滿隊列', async () => {
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步提交
        },
        async () => {
          // 異步提交
        },
        {
          asyncThreshold: EventPriority.LOW,
          maxAsyncQueueDepth: 100, // 小隊列
        }
      )

      // 第一輪：填滿隊列
      for (let i = 0; i < 100; i++) {
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`], {
            priority: EventPriority.LOW,
          })
        )
      }

      expect(asyncPath.getAsyncQueueDepth()).toBeLessThanOrEqual(100)

      // 清空隊列
      await asyncPath.stop()

      expect(asyncPath.getAsyncQueueDepth()).toBe(0)

      // 第二輪：應該能夠再次提交
      for (let i = 0; i < 50; i++) {
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i + 100}`], {
            priority: EventPriority.LOW,
          })
        )
      }

      expect(asyncPath.getAsyncQueueDepth()).toBeGreaterThan(0)
    })
  })

  describe('E. 內存效率驗證', () => {
    it('應該在 100K 事件提交中不洩漏內存', async () => {
      const initialMem = process.memoryUsage().heapUsed

      const submitter = createBatchSubmitter(
        async () => {
          // 提交操作
        },
        1000,
        100
      )

      // 提交 100K 個事件
      for (let i = 0; i < 100000; i++) {
        await submitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i % 1000}`])
        )
      }

      await submitter.stop()

      const finalMem = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMem - initialMem) / 1024 / 1024 // MB

      // 期望內存增長 < 50MB（合理的資料結構存儲）
      expect(memoryIncrease).toBeLessThan(50)
    })

    it('應該在去重中保持內存效率', () => {
      const initialMem = process.memoryUsage().heapUsed

      const deduplicator = new EventDeduplicator()

      const events = []
      for (let i = 0; i < 50000; i++) {
        events.push(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [
            `product:${i % 100}`,
            `category:${i % 10}`,
          ])
        )
      }

      deduplicator.addEvents(events)
      void deduplicator.getDeduplicated()

      const finalMem = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMem - initialMem) / 1024 / 1024 // MB

      // 期望內存增長 < 20MB
      expect(memoryIncrease).toBeLessThan(20)
    })
  })

  describe('F. 性能一致性', () => {
    it('應該在不同負載下保持性能比例', () => {
      const timings = []

      for (const size of [1000, 10000, 100000]) {
        const startTime = performance.now()

        for (let i = 0; i < size; i++) {
          void createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`])
        }

        timings.push(performance.now() - startTime)
      }

      // 驗證性能增長是線性的（或接近線性）
      const ratio1 = timings[1] / timings[0]

      // 比例應該接近（10x 增長應該花約 10x 時間）
      expect(ratio1).toBeGreaterThan(5) // 至少 5x
      expect(ratio1).toBeLessThan(15) // 不超過 15x
    })

    it('應該在重複操作中保持一致', () => {
      const durations = []

      for (let run = 0; run < 10; run++) {
        const queue = new EventQueue()

        // 填充隊列
        for (let i = 0; i < 1000; i++) {
          queue.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`product:${i}`]))
        }

        const startTime = performance.now()

        // 出隊所有元素
        while (queue.peek()) {
          queue.dequeue()
        }

        durations.push(performance.now() - startTime)
      }

      // 驗證性能波動在合理範圍（標準差不超過平均值的 100%）
      const avg = durations.reduce((a, b) => a + b) / durations.length
      const variance = durations.reduce((acc, val) => acc + (val - avg) ** 2, 0) / durations.length
      const stdDev = Math.sqrt(variance)

      // 允許較大的波動（JS 執行時間變化較大）
      expect(stdDev).toBeLessThan(avg * 1.5)
    })
  })
})
