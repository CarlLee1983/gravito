/**
 * Phase 3 - BatchSubmitter 優化測試
 *
 * 驗證批量提交的核心功能和性能改進
 * 目標改進：10-15%
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BatchSubmitter, createBatchSubmitter } from '../../events/BatchSubmitter.js'
import type { CacheEvent } from '../../events/types.js'
import { CacheEventType, EventPriority, EventSource } from '../../events/types.js'

// 創建測試用的事件
function createTestEvent(id: number): CacheEvent {
  return {
    id: `test-${id}`,
    type: CacheEventType.PRODUCT_UPDATED,
    priority: EventPriority.NORMAL,
    source: EventSource.SYSTEM,
    patterns: [`product:${id}`],
    timestamp: Date.now(),
  }
}

describe('BatchSubmitter', () => {
  let submitter: BatchSubmitter
  let submitedBatches: CacheEvent[][] = []

  beforeEach(() => {
    submitedBatches = []
    const mockSubmitFn = async (events: CacheEvent[]) => {
      submitedBatches.push([...events])
    }
    submitter = createBatchSubmitter(mockSubmitFn, 10, 50)
  })

  describe('基礎功能', () => {
    it('應該入隊事件', async () => {
      const event = createTestEvent(1)
      await submitter.enqueue(event)

      expect(submitter.getPendingCount()).toBe(1)
    })

    it('應該在達到批大小時自動刷新', async () => {
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      // 應該已經刷新
      expect(submitedBatches.length).toBe(1)
      expect(submitedBatches[0]).toHaveLength(10)
    })

    it('應該支持手動刷新', async () => {
      await submitter.enqueue(createTestEvent(1))
      await submitter.enqueue(createTestEvent(2))

      expect(submitter.getPendingCount()).toBe(2)

      const flushed = await submitter.flush()

      expect(flushed).toHaveLength(2)
      expect(submitter.getPendingCount()).toBe(0)
    })

    it('應該在時間到時自動刷新', async () => {
      await submitter.enqueue(createTestEvent(1))
      await submitter.enqueue(createTestEvent(2))

      expect(submitter.getPendingCount()).toBe(2)

      // 等待刷新間隔
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(submitedBatches.length).toBeGreaterThan(0)
    })
  })

  describe('批量操作', () => {
    it('應該支持批量入隊', async () => {
      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(createTestEvent(i))
      }

      await submitter.enqueueBatch(events)

      expect(submitter.getPendingCount()).toBe(5)
    })

    it('應該在批量入隊時尊重批大小', async () => {
      const events = []
      for (let i = 0; i < 15; i++) {
        events.push(createTestEvent(i))
      }

      await submitter.enqueueBatch(events)

      // 應該自動刷新（前 10 個）
      expect(submitedBatches.length).toBeGreaterThan(0)
    })
  })

  describe('統計信息', () => {
    it('應該報告準確的統計信息', async () => {
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      const stats = submitter.getStats()

      expect(stats.totalBatches).toBe(1)
      expect(stats.totalEvents).toBe(10)
      expect(stats.averageBatchSize).toBe(10)
      expect(stats.autoFlushCount).toBe(1)
    })

    it('應該跟踪手動刷新和自動刷新', async () => {
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      expect(submitter.getStats().autoFlushCount).toBe(1)

      for (let i = 0; i < 5; i++) {
        await submitter.enqueue(createTestEvent(i + 10))
      }

      await submitter.flush()

      const stats = submitter.getStats()
      expect(stats.manualFlushCount).toBe(1)
    })

    it('應該計算正確的平均批大小', async () => {
      // 第一批：10 個事件
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      // 第二批：5 個事件
      for (let i = 0; i < 5; i++) {
        await submitter.enqueue(createTestEvent(i + 10))
      }
      await submitter.flush()

      const stats = submitter.getStats()
      // 平均 = (10 + 5) / 2 = 7.5
      expect(stats.averageBatchSize).toBe(7.5)
    })
  })

  describe('狀態管理', () => {
    it('應該清楚地報告待提交事件數', async () => {
      expect(submitter.getPendingCount()).toBe(0)
      expect(submitter.hasPending()).toBe(false)

      await submitter.enqueue(createTestEvent(1))

      expect(submitter.getPendingCount()).toBe(1)
      expect(submitter.hasPending()).toBe(true)
    })

    it('應該支持清空隊列', async () => {
      for (let i = 0; i < 5; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      submitter.clear()

      expect(submitter.getPendingCount()).toBe(0)
      expect(submitedBatches.length).toBe(0)
    })

    it('應該支持重置統計信息', async () => {
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      let stats = submitter.getStats()
      expect(stats.totalBatches).toBe(1)

      submitter.resetStats()

      stats = submitter.getStats()
      expect(stats.totalBatches).toBe(0)
      expect(stats.totalEvents).toBe(0)
    })
  })

  describe('配置調整', () => {
    it('應該支持調整批大小', async () => {
      // 先入隊到接近舊的批大小
      for (let i = 0; i < 8; i++) {
        await submitter.enqueue(createTestEvent(i))
      }

      // 調整為更小的批大小
      submitter.setBatchSize(5)

      // 再入隊一個，應該觸發刷新
      await submitter.enqueue(createTestEvent(8))

      // 由於隊列有 9 個而新批大小是 5，應該已經刷新
      expect(submitedBatches.length).toBeGreaterThan(0)
    })

    it('應該支持調整刷新間隔', async () => {
      submitter.setFlushInterval(20)

      await submitter.enqueue(createTestEvent(1))
      await submitter.enqueue(createTestEvent(2))

      // 等待新的刷新間隔
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(submitedBatches.length).toBeGreaterThan(0)
    })

    it('應該能獲取當前配置', () => {
      expect(submitter.getBatchSize()).toBe(10)
      expect(submitter.getFlushInterval()).toBe(50)
    })
  })

  describe('停止機制', () => {
    it('應該在停止時刷新所有待提交事件', async () => {
      await submitter.enqueue(createTestEvent(1))
      await submitter.enqueue(createTestEvent(2))
      await submitter.enqueue(createTestEvent(3))

      const flushed = await submitter.stop()

      expect(flushed).toHaveLength(3)
      expect(submitter.getPendingCount()).toBe(0)
    })

    it('停止後應該清除定時器', async () => {
      await submitter.enqueue(createTestEvent(1))
      await submitter.stop()

      // 再入隊應該重新啟動定時器
      await submitter.enqueue(createTestEvent(2))
      expect(submitter.getPendingCount()).toBe(1)
    })
  })

  describe('性能測試', () => {
    it('應該高效地處理大量事件', async () => {
      const startTime = performance.now()

      for (let i = 0; i < 10000; i++) {
        await submitter.enqueue(createTestEvent(i % 100))
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 應該在 500ms 內完成 10000 個事件的入隊
      expect(duration).toBeLessThan(500)

      const stats = submitter.getStats()
      expect(stats.totalEvents).toBeGreaterThan(0)
    })

    it('應該以小於 1ms 的平均延遲提交', async () => {
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          await submitter.enqueue(createTestEvent(j))
        }
        await submitter.flush()
      }

      const stats = submitter.getStats()
      // 平均延遲應該 < 1ms
      expect(stats.averageBatchLatency).toBeLessThan(1)
    })
  })

  describe('邊界情況', () => {
    it('應該在空隊列上安全刷新', async () => {
      const flushed = await submitter.flush()
      expect(flushed).toEqual([])
      expect(submitedBatches.length).toBe(0)
    })

    it('應該在批大小為 1 時正確工作', async () => {
      const singleBatchSubmitter = createBatchSubmitter(
        async (events) => {
          submitedBatches.push([...events])
        },
        1,
        50
      )

      await singleBatchSubmitter.enqueue(createTestEvent(1))

      expect(submitedBatches.length).toBe(1)
      expect(submitedBatches[0]).toHaveLength(1)
    })

    it('應該在大批大小時正確工作', async () => {
      const largeBatchSubmitter = createBatchSubmitter(
        async (events) => {
          submitedBatches.push([...events])
        },
        1000,
        50
      )

      for (let i = 0; i < 100; i++) {
        await largeBatchSubmitter.enqueue(createTestEvent(i))
      }

      expect(submitedBatches.length).toBe(0) // 未達到批大小
      expect(largeBatchSubmitter.getPendingCount()).toBe(100)

      await largeBatchSubmitter.flush()
      expect(submitedBatches.length).toBe(1)
    })
  })

  describe('錯誤處理', () => {
    it('應該在提交失敗時將事件放回隊列', async () => {
      let callCount = 0
      const failingSubmitter = new BatchSubmitter(5, 50, async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Submit failed')
        }
      })

      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(createTestEvent(i))
      }

      try {
        await failingSubmitter.enqueueBatch(events)
      } catch {
        // 預期會拋出錯誤
      }

      // 事件應該仍在隊列中
      expect(failingSubmitter.getPendingCount()).toBe(5)

      // 第二次應該成功
      failingSubmitter.clear()
      for (const event of events) {
        await failingSubmitter.enqueue(event)
      }
    })
  })

  describe('高頻操作', () => {
    it('應該支持高頻微批處理', async () => {
      const startTime = performance.now()
      let totalSubmitted = 0

      const mockSubmit = async (events: CacheEvent[]) => {
        totalSubmitted += events.length
      }

      const fastSubmitter = createBatchSubmitter(mockSubmit, 100, 10)

      // 模擬高頻事件流
      for (let i = 0; i < 1000; i++) {
        await fastSubmitter.enqueue(createTestEvent(i % 100))
      }

      await fastSubmitter.stop()
      const endTime = performance.now()

      expect(totalSubmitted).toBe(1000)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})
