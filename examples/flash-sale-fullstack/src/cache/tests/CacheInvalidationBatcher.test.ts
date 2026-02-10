/**
 * CacheInvalidationBatcher 單元測試
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CacheInvalidationBatcher } from '../CacheInvalidationBatcher'

describe('CacheInvalidationBatcher', () => {
  let batcher: CacheInvalidationBatcher
  let mockL1Cache: any
  let mockL2Cache: any
  let mockDlqManager: any

  beforeEach(() => {
    mockL1Cache = {
      deletePattern: mock((pattern) => 5),
    }

    mockL2Cache = {
      deletePattern: mock(async () => 5),
    }

    mockDlqManager = {
      moveToDLQ: mock(async () => true),
    }

    batcher = new CacheInvalidationBatcher(mockL1Cache, mockL2Cache, mockDlqManager)
  })

  describe('addInvalidationEvent', () => {
    it('應該添加失效事件到隊列', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'order-service',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event)
      // 事件應該被添加到隊列
    })

    it('高優先級事件應該立即處理', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'order-service',
        priority: 'high' as const,
      }

      await batcher.addInvalidationEvent(event)
      expect(mockL1Cache.deletePattern).toHaveBeenCalled()
    })

    it('應該追蹤事件總數', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'order-service',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event)
      const stats = batcher.getStats()
      expect(stats.totalEvents).toBeGreaterThan(0)
    })
  })

  describe('批量處理', () => {
    it('應該在批處理窗口內合併事件', async () => {
      const event1 = {
        pattern: 'product:1',
        timestamp: Date.now(),
        source: 'service-1',
        priority: 'normal' as const,
      }

      const event2 = {
        pattern: 'product:2',
        timestamp: Date.now(),
        source: 'service-2',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event1)
      await batcher.addInvalidationEvent(event2)

      // 等待批處理窗口
      await new Promise((resolve) => setTimeout(resolve, 250))

      const stats = batcher.getStats()
      expect(stats.batchesProcessed).toBeGreaterThan(0)
    })

    it('應該去重相同模式', async () => {
      const event1 = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service-1',
        priority: 'normal' as const,
      }

      const event2 = {
        pattern: 'product:.*',
        timestamp: Date.now() + 100,
        source: 'service-2',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event1)
      await batcher.addInvalidationEvent(event2)

      // 應該只執行一次失效
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
  })

  describe('stats', () => {
    it('應該追蹤批次數', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'high' as const,
      }

      await batcher.addInvalidationEvent(event)
      await batcher.addInvalidationEvent(event)

      const stats = batcher.getStats()
      expect(stats.batchesProcessed).toBeGreaterThan(0)
    })

    it('應該追蹤平均批次大小', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event)
      await batcher.addInvalidationEvent(event)

      await new Promise((resolve) => setTimeout(resolve, 250))

      const stats = batcher.getStats()
      expect(stats.avgBatchSize).toBeGreaterThan(0)
    })

    it('應該追蹤失敗次數', async () => {
      mockL1Cache.deletePattern = mock(() => {
        throw new Error('L1 error')
      })

      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'high' as const,
      }

      await batcher.addInvalidationEvent(event)

      const stats = batcher.getStats()
      expect(stats.failedCount).toBeGreaterThan(0)
    })
  })

  describe('DLQ 集成', () => {
    it('失敗事件應該進入 DLQ', async () => {
      mockL1Cache.deletePattern = mock(() => {
        throw new Error('L1 error')
      })

      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'high' as const,
      }

      await batcher.addInvalidationEvent(event)

      const stats = batcher.getStats()
      expect(stats.dlqCount).toBeGreaterThan(0)
    })
  })

  describe('resetStats', () => {
    it('應該重置所有統計', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'high' as const,
      }

      await batcher.addInvalidationEvent(event)
      batcher.resetStats()

      const stats = batcher.getStats()
      expect(stats.totalEvents).toBe(0)
      expect(stats.batchesProcessed).toBe(0)
      expect(stats.failedCount).toBe(0)
    })
  })

  describe('stop', () => {
    it('應該安全地停止', async () => {
      const event = {
        pattern: 'product:.*',
        timestamp: Date.now(),
        source: 'service',
        priority: 'normal' as const,
      }

      await batcher.addInvalidationEvent(event)
      await batcher.stop()
      // 應該不會錯誤
    })
  })
})
