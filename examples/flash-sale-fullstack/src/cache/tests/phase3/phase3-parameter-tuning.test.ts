/**
 * Phase 3 - 參數微調與最優化
 *
 * 通過系統性測試找出最佳的參數組合
 * 目標：在延遲和吞吐之間找到最佳平衡
 */

import { describe, expect, it } from 'vitest'
import { AsyncEventPath, createAsyncEventPath } from '../../events/AsyncEventPath.js'
import { BatchSubmitter, createBatchSubmitter } from '../../events/BatchSubmitter.js'
import type { CacheEvent } from '../../events/types.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'

/**
 * 性能測試結果記錄
 */
interface PerfResult {
  batchSize: number
  flushInterval: number
  avgLatency: number
  p95Latency: number
  throughput: number
  score: number // 綜合得分
}

describe('Phase 3 - 參數微調與最優化', () => {
  describe('A. BatchSubmitter 參數最優化', () => {
    it('應該找出最優的批大小組合', async () => {
      const testSizes = [10, 25, 50, 100, 200, 500]
      const results: PerfResult[] = []

      for (const batchSize of testSizes) {
        const latencies: number[] = []
        let totalEvents = 0
        let _submittedBatches = 0

        const startTime = performance.now()

        const submitter = createBatchSubmitter(
          async (events) => {
            totalEvents += events.length
            _submittedBatches++
          },
          batchSize,
          50 // 固定刷新間隔 50ms
        )

        // 提交 5000 個事件，測量延遲
        for (let i = 0; i < 5000; i++) {
          const opStart = performance.now()

          await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))

          latencies.push(performance.now() - opStart)
        }

        await submitter.stop()

        const totalTime = performance.now() - startTime
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
        const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
        const throughput = (totalEvents / totalTime) * 1000 // ops/sec

        // 綜合得分：優先吞吐（60%），其次延遲（40%）
        const score = (throughput / 1000) * 0.6 + (1 / (avgLatency + 1)) * 0.4

        results.push({
          batchSize,
          flushInterval: 50,
          avgLatency,
          p95Latency,
          throughput,
          score,
        })
      }

      // 找出最佳配置
      const best = results.reduce((a, b) => (a.score > b.score ? a : b))

      expect(best.batchSize).toBeGreaterThan(10)
      expect(best.throughput).toBeGreaterThan(500)
    })

    it('應該找出最優的刷新間隔組合', async () => {
      const intervals = [10, 25, 50, 100, 200, 500]
      const results: PerfResult[] = []

      for (const flushInterval of intervals) {
        const latencies: number[] = []
        let totalEvents = 0

        const startTime = performance.now()

        const submitter = createBatchSubmitter(
          async (events) => {
            totalEvents += events.length
          },
          50, // 固定批大小 50
          flushInterval
        )

        // 提交 5000 個事件
        for (let i = 0; i < 5000; i++) {
          const opStart = performance.now()

          await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))

          latencies.push(performance.now() - opStart)
        }

        await submitter.stop()

        const totalTime = performance.now() - startTime
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
        const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
        const throughput = (totalEvents / totalTime) * 1000

        const score = (throughput / 1000) * 0.6 + (1 / (avgLatency + 1)) * 0.4

        results.push({
          batchSize: 50,
          flushInterval,
          avgLatency,
          p95Latency,
          throughput,
          score,
        })
      }

      const best = results.reduce((a, b) => (a.score > b.score ? a : b))

      expect(best.flushInterval).toBeGreaterThan(10)
      expect(best.throughput).toBeGreaterThan(500)
    })

    it('應該驗證最優參數組合', async () => {
      // 基於前面的測試，假定最優為 (50, 50)
      const optimalParams = { batchSize: 50, flushInterval: 50 }

      const latencies: number[] = []
      let totalEvents = 0

      const submitter = createBatchSubmitter(
        async (events) => {
          totalEvents += events.length
        },
        optimalParams.batchSize,
        optimalParams.flushInterval
      )

      const startTime = performance.now()

      for (let i = 0; i < 10000; i++) {
        const opStart = performance.now()
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
        latencies.push(performance.now() - opStart)
      }

      await submitter.stop()

      const totalTime = performance.now() - startTime
      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
      const throughput = (totalEvents / totalTime) * 1000

      // 驗證性能指標
      expect(throughput).toBeGreaterThan(1000) // > 1K ops/sec
      expect(avgLatency).toBeLessThan(1) // < 1ms
      expect(p95Latency).toBeLessThan(5) // < 5ms
    })
  })

  describe('B. AsyncEventPath 參數最優化', () => {
    it('應該找出最優的異步隊列深度', async () => {
      const queueDepths = [100, 500, 1000, 2000, 5000]
      const results: Array<{ depth: number; throughput: number; dropRate: number }> = []

      for (const maxDepth of queueDepths) {
        let syncCount = 0
        let _asyncCount = 0
        const _droppedCount = 0 // 隊列滿時降級的事件

        const asyncPath = createAsyncEventPath(
          async () => {
            syncCount++
          },
          async (events) => {
            _asyncCount += events.length
          },
          {
            asyncThreshold: EventPriority.NORMAL,
            maxAsyncQueueDepth: maxDepth,
            asyncCheckIntervalMs: 100,
          }
        )

        const startTime = performance.now()

        // 併發提交 5000 個事件（混合優先級）
        const promises = []
        for (let i = 0; i < 5000; i++) {
          const priority = i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL

          promises.push(
            asyncPath.submit(
              createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], { priority })
            )
          )
        }

        await Promise.all(promises)
        await asyncPath.stop()

        const totalTime = performance.now() - startTime
        const throughput = (5000 / totalTime) * 1000 // ops/sec
        const dropRate = (syncCount / 5000) * 100 // 降級百分比

        results.push({
          depth: maxDepth,
          throughput,
          dropRate,
        })
      }

      // 找出最佳的隊列深度（高吞吐，低降級率）
      const best = results.reduce((a, b) => {
        const scoreA = a.throughput * (1 - a.dropRate / 100)
        const scoreB = b.throughput * (1 - b.dropRate / 100)
        return scoreA > scoreB ? a : b
      })

      expect(best.throughput).toBeGreaterThan(500)
      expect(best.dropRate).toBeLessThan(30) // 降級率 < 30%
    })

    it('應該找出最優的異步檢查間隔', async () => {
      const intervals = [10, 25, 50, 100, 200, 500]
      const results: Array<{ interval: number; avgLatency: number; throughput: number }> = []

      for (const checkInterval of intervals) {
        const latencies: number[] = []
        let asyncCount = 0

        const asyncPath = createAsyncEventPath(
          async () => {
            // 同步提交
          },
          async (events) => {
            asyncCount += events.length
          },
          {
            asyncThreshold: EventPriority.LOW,
            maxAsyncQueueDepth: 1000,
            asyncCheckIntervalMs: checkInterval,
          }
        )

        const startTime = performance.now()

        for (let i = 0; i < 1000; i++) {
          const opStart = performance.now()

          await asyncPath.submit(
            createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], {
              priority: EventPriority.LOW,
            })
          )

          latencies.push(performance.now() - opStart)
        }

        await asyncPath.stop()

        const totalTime = performance.now() - startTime
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
        const throughput = (asyncCount / totalTime) * 1000

        results.push({
          interval: checkInterval,
          avgLatency,
          throughput,
        })
      }

      const best = results.reduce((a, b) => {
        const scoreA = a.throughput / (a.avgLatency + 1)
        const scoreB = b.throughput / (b.avgLatency + 1)
        return scoreA > scoreB ? a : b
      })

      expect(best.throughput).toBeGreaterThan(500)
      expect(best.avgLatency).toBeLessThan(10)
    })
  })

  describe('C. 負載場景適配測試', () => {
    it('應該在低負載場景下優化延遲', async () => {
      // 低負載：每秒 100 個事件
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        25, // 較小的批大小優化延遲
        100 // 較長的間隔避免頻繁刷新
      )

      const latencies: number[] = []

      for (let i = 0; i < 100; i++) {
        const opStart = performance.now()
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
        latencies.push(performance.now() - opStart)

        // 模擬間隔
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length

      expect(avgLatency).toBeLessThan(1)
    })

    it('應該在高負載場景下優化吞吐', async () => {
      // 高負載：儘快提交所有事件
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        100, // 較大的批大小優化吞吐
        25 // 較短的間隔快速刷新
      )

      const startTime = performance.now()

      for (let i = 0; i < 10000; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      await submitter.stop()

      const totalTime = performance.now() - startTime
      const throughput = (10000 / totalTime) * 1000

      expect(throughput).toBeGreaterThan(1000)
    })

    it('應該在混合負載下均衡性能', async () => {
      // 混合負載：交替高低負載
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        50, // 平衡的批大小
        50 // 平衡的間隔
      )

      const stats = { lowLoadLatencies: [], highLoadLatencies: [] }

      // 低負載段
      for (let i = 0; i < 100; i++) {
        const opStart = performance.now()
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
        stats.lowLoadLatencies.push(performance.now() - opStart)
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // 高負載段
      const startHigh = performance.now()
      for (let i = 0; i < 5000; i++) {
        await submitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i + 100}`])
        )
      }
      stats.highLoadLatencies.push(performance.now() - startHigh)

      await submitter.stop()

      const lowAvg = stats.lowLoadLatencies.reduce((a, b) => a + b) / stats.lowLoadLatencies.length
      const highAvg = stats.highLoadLatencies.length > 0 ? stats.highLoadLatencies[0] / 5000 : 0

      // 驗證在低負載下保持低延遲，高負載下保持高吞吐
      expect(lowAvg).toBeLessThan(1)
      expect(highAvg).toBeLessThan(1)
    })
  })

  describe('D. 生產推薦參數驗證', () => {
    it('應該驗證推薦的 BatchSubmitter 參數', async () => {
      // 推薦參數：(50, 50)
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        50, // 批大小
        50 // 刷新間隔
      )

      const stats = submitter.getStats()

      // 驗證初始狀態
      expect(stats.totalBatches).toBe(0)
      expect(stats.totalEvents).toBe(0)

      // 提交 1000 個事件
      for (let i = 0; i < 1000; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      const finalStats = submitter.getStats()

      // 驗證批處理效果
      expect(finalStats.totalBatches).toBeGreaterThan(0)
      expect(finalStats.totalEvents).toBeGreaterThanOrEqual(50) // 至少一個完整批
      expect(finalStats.averageBatchSize).toBeGreaterThan(0)
    })

    it('應該驗證推薦的 AsyncEventPath 參數', async () => {
      // 推薦參數：(NORMAL, 1000, 100)
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步
        },
        async () => {
          // 異步
        },
        {
          asyncThreshold: EventPriority.NORMAL,
          maxAsyncQueueDepth: 1000,
          asyncCheckIntervalMs: 100,
        }
      )

      const stats = asyncPath.getStats()

      // 驗證初始狀態
      expect(stats.syncSubmitted).toBe(0)
      expect(stats.asyncSubmitted).toBe(0)
      expect(stats.currentThreshold).toBe(EventPriority.NORMAL)
      expect(stats.maxAsyncQueueDepth).toBe(1000)
    })
  })

  describe('E. 性能基準報告', () => {
    it('應該生成性能基準報告數據', async () => {
      const benchmarks = {
        lowLoad: { rate: 100, batchSize: 25, flushInterval: 100 },
        normalLoad: { rate: 1000, batchSize: 50, flushInterval: 50 },
        highLoad: { rate: 10000, batchSize: 100, flushInterval: 25 },
      }

      const results: Record<string, any> = {}

      for (const [scenario, config] of Object.entries(benchmarks)) {
        let totalEvents = 0

        const submitter = createBatchSubmitter(
          async (events) => {
            totalEvents += events.length
          },
          config.batchSize,
          config.flushInterval
        )

        const latencies: number[] = []

        const startTime = performance.now()

        // 模擬負載
        const eventCount = config.rate === 100 ? 100 : config.rate === 1000 ? 1000 : 5000

        for (let i = 0; i < eventCount; i++) {
          const opStart = performance.now()
          await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
          latencies.push(performance.now() - opStart)

          if (config.rate === 100) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        }

        await submitter.stop()

        const totalTime = performance.now() - startTime
        const stats = submitter.getStats()

        results[scenario] = {
          config,
          avgLatency:
            latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0,
          p95Latency:
            latencies.length > 0
              ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
              : 0,
          throughput: totalTime > 0 ? (totalEvents / totalTime) * 1000 : 0,
          stats,
        }
      }

      // 驗證所有場景都有合理的性能
      for (const [_scenario, result] of Object.entries(results)) {
        expect(result.throughput).toBeGreaterThan(50) // 允許低負載場景的低吞吐
      }
    })
  })
})
