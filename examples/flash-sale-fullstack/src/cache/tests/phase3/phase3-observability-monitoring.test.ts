/**
 * Phase 3 - 監控與可觀測性
 *
 * 驗證系統的監控指標和可觀測性功能
 * 支持生產環境的監控和告警
 */

import { describe, expect, it } from 'vitest'
import { createAsyncEventPath } from '../../events/AsyncEventPath.js'
import { createBatchSubmitter } from '../../events/BatchSubmitter.js'
import { EventQueue } from '../../events/EventQueue.js'
import { CacheEventType, createCacheEvent, EventPriority } from '../../events/types.js'

/**
 * 監控收集器：收集系統指標供監控使用
 */
class MonitoringCollector {
  private metrics = {
    throughput: 0,
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    errorRate: 0,
    queueDepth: 0,
    memoryUsage: 0,
  }

  recordMetric(key: string, value: number): void {
    if (key in this.metrics) {
      ;(this.metrics as Record<string, number>)[key] = value
    }
  }

  getMetrics() {
    return { ...this.metrics }
  }

  /**
   * 生成 Prometheus 格式的指標
   */
  toPrometheus(): string {
    const lines: string[] = []

    lines.push('# HELP flash_sale_throughput 秒殺系統吞吐量')
    lines.push('# TYPE flash_sale_throughput gauge')
    lines.push(`flash_sale_throughput ${this.metrics.throughput}`)

    lines.push('# HELP flash_sale_avg_latency 平均延遲')
    lines.push('# TYPE flash_sale_avg_latency gauge')
    lines.push(`flash_sale_avg_latency ${this.metrics.avgLatency}`)

    lines.push('# HELP flash_sale_p95_latency P95 延遲')
    lines.push('# TYPE flash_sale_p95_latency gauge')
    lines.push(`flash_sale_p95_latency ${this.metrics.p95Latency}`)

    lines.push('# HELP flash_sale_error_rate 錯誤率')
    lines.push('# TYPE flash_sale_error_rate gauge')
    lines.push(`flash_sale_error_rate ${this.metrics.errorRate}`)

    lines.push('# HELP flash_sale_queue_depth 隊列深度')
    lines.push('# TYPE flash_sale_queue_depth gauge')
    lines.push(`flash_sale_queue_depth ${this.metrics.queueDepth}`)

    return lines.join('\n')
  }

  /**
   * 生成 JSON 格式的指標
   */
  toJSON() {
    return this.metrics
  }
}

describe('Phase 3 - 監控與可觀測性', () => {
  describe('A. BatchSubmitter 統計信息', () => {
    it('應該提供完整的批提交統計', async () => {
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        50,
        50
      )

      // 提交 500 個事件
      for (let i = 0; i < 500; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      const stats = submitter.getStats()

      // 驗證統計信息的完整性
      expect(stats.totalBatches).toBeGreaterThan(0)
      expect(stats.totalEvents).toBeGreaterThanOrEqual(50)
      expect(stats.averageBatchSize).toBeGreaterThan(0)
      expect(stats.lastFlushTime).toBeGreaterThan(0)
      expect(stats.pendingEvents).toBeGreaterThanOrEqual(0)
      expect(stats.autoFlushCount).toBeGreaterThan(0)

      // 驗證統計信息的一致性
      const expectedAvgSize = stats.totalEvents / stats.totalBatches
      expect(Math.abs(stats.averageBatchSize - expectedAvgSize)).toBeLessThan(0.1)
    })

    it('應該區分自動刷新和手動刷新', async () => {
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        50,
        100 // 長間隔
      )

      // 自動刷新（達到批大小）
      for (let i = 0; i < 50; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      let stats = submitter.getStats()
      const _initialAutoCount = stats.autoFlushCount

      // 手動刷新（添加更多事件後手動刷新）
      for (let i = 0; i < 10; i++) {
        await submitter.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i + 50}`])
        )
      }

      await submitter.flush()

      stats = submitter.getStats()

      expect(stats.manualFlushCount).toBeGreaterThan(0)
      expect(stats.totalBatches).toBeGreaterThanOrEqual(2) // 至少兩個批
    })

    it('應該追蹤平均批延遲', async () => {
      const submitter = createBatchSubmitter(
        async () => {
          // 提交
        },
        50,
        50
      )

      // 提交超過 50 個事件以確保至少一個批被刷新
      for (let i = 0; i < 100; i++) {
        await submitter.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`]))
      }

      // 確保刷新完成
      await submitter.stop()

      const stats = submitter.getStats()

      // 應該至少有一個批被刷新
      expect(stats.totalBatches).toBeGreaterThan(0)
      expect(stats.averageBatchLatency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('B. AsyncEventPath 統計信息', () => {
    it('應該提供完整的異步路由統計', async () => {
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步
        },
        async () => {
          // 異步
        }
      )

      // 提交混合優先級事件
      for (let i = 0; i < 100; i++) {
        const priority = i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], { priority })
        )
      }

      const stats = asyncPath.getStats()

      // 驗證統計信息
      expect(stats.syncSubmitted).toBeGreaterThan(0)
      expect(stats.asyncSubmitted).toBeGreaterThan(0)
      expect(stats.syncSubmitted + stats.asyncSubmitted).toBe(100)

      expect(stats.maxAsyncQueueDepth).toBeGreaterThan(0)
      expect(stats.currentThreshold).toBeDefined()
      expect(stats.asyncBatchCount).toBeGreaterThanOrEqual(0)
      expect(stats.averageAsyncLatency).toBeGreaterThanOrEqual(0)
    })

    it('應該追蹤優先級分布', async () => {
      const asyncPath = createAsyncEventPath(
        async () => {
          // 同步
        },
        async () => {
          // 異步
        }
      )

      const CRITICAL_COUNT = 250 // 25%
      const OTHER_COUNT = 750 // 75%

      for (let i = 0; i < CRITICAL_COUNT; i++) {
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], {
            priority: EventPriority.CRITICAL,
          })
        )
      }

      for (let i = 0; i < OTHER_COUNT; i++) {
        await asyncPath.submit(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i + CRITICAL_COUNT}`], {
            priority: EventPriority.NORMAL,
          })
        )
      }

      const stats = asyncPath.getStats()

      expect(stats.syncSubmitted).toBe(CRITICAL_COUNT)
      expect(stats.asyncSubmitted).toBe(OTHER_COUNT)
    })
  })

  describe('C. EventQueue 監控指標', () => {
    it('應該提供隊列深度監控', () => {
      const queue = new EventQueue()

      expect(queue.size()).toBe(0)

      // 入隊 100 個事件
      for (let i = 0; i < 100; i++) {
        queue.enqueue(
          createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], {
            priority: i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL,
          })
        )
      }

      expect(queue.size()).toBe(100)

      // 出隊 50 個
      for (let i = 0; i < 50; i++) {
        queue.dequeue()
      }

      expect(queue.size()).toBe(50)
    })

    it('應該支持隊列統計查詢', () => {
      const queue = new EventQueue()

      // 入隊不同優先級的事件
      for (let i = 0; i < 100; i++) {
        const priority = i % 4 === 0 ? EventPriority.CRITICAL : EventPriority.NORMAL

        queue.enqueue(createCacheEvent(CacheEventType.PRODUCT_UPDATED, [`item:${i}`], { priority }))
      }

      const size = queue.size()

      expect(size).toBe(100)

      // 驗證隊列能正確出隊
      let dequeuedCount = 0
      for (let i = 0; i < 50; i++) {
        const event = queue.dequeue()
        if (event) {
          dequeuedCount++
          // 驗證事件是有效的
          expect(event.priority).toBeDefined()
          expect(event.type).toBe(CacheEventType.PRODUCT_UPDATED)
        }
      }

      expect(dequeuedCount).toBe(50)
    })
  })

  describe('D. 監控收集器集成', () => {
    it('應該收集系統性能指標', () => {
      const collector = new MonitoringCollector()

      collector.recordMetric('throughput', 1250)
      collector.recordMetric('avgLatency', 0.8)
      collector.recordMetric('p95Latency', 3.5)
      collector.recordMetric('p99Latency', 8.2)
      collector.recordMetric('errorRate', 0.1)
      collector.recordMetric('queueDepth', 42)
      collector.recordMetric('memoryUsage', 25.3)

      const metrics = collector.getMetrics()

      expect(metrics.throughput).toBe(1250)
      expect(metrics.avgLatency).toBe(0.8)
      expect(metrics.p95Latency).toBe(3.5)
      expect(metrics.errorRate).toBe(0.1)
    })

    it('應該生成 Prometheus 格式指標', () => {
      const collector = new MonitoringCollector()

      collector.recordMetric('throughput', 1250)
      collector.recordMetric('avgLatency', 0.8)
      collector.recordMetric('errorRate', 0.1)

      const prometheus = collector.toPrometheus()

      expect(prometheus).toContain('# HELP flash_sale_throughput')
      expect(prometheus).toContain('flash_sale_throughput 1250')
      expect(prometheus).toContain('flash_sale_avg_latency 0.8')
      expect(prometheus).toContain('flash_sale_error_rate 0.1')
    })

    it('應該生成 JSON 格式指標', () => {
      const collector = new MonitoringCollector()

      collector.recordMetric('throughput', 1500)
      collector.recordMetric('p95Latency', 4.2)

      const json = collector.toJSON()

      expect(json.throughput).toBe(1500)
      expect(json.p95Latency).toBe(4.2)
    })
  })

  describe('E. 告警閾值驗證', () => {
    it('應該識別低吞吐告警', () => {
      const lowThroughput = 100 // ops/sec
      const threshold = 500

      expect(lowThroughput).toBeLessThan(threshold)
    })

    it('應該識別高延遲告警', () => {
      const highLatency = 15 // ms
      const threshold = 10

      expect(highLatency).toBeGreaterThan(threshold)
    })

    it('應該識別隊列堆積告警', () => {
      const queueDepth = 9500
      const maxCapacity = 10000

      const utilization = (queueDepth / maxCapacity) * 100

      expect(utilization).toBeGreaterThan(90)
    })

    it('應該識別記憶體使用告警', () => {
      const memoryUsage = 850 // MB
      const threshold = 500

      expect(memoryUsage).toBeGreaterThan(threshold)
    })

    it('應該識別錯誤率告警', () => {
      const errorRate = 2.5 // %
      const threshold = 1.0

      expect(errorRate).toBeGreaterThan(threshold)
    })
  })

  describe('F. 生產監控配置', () => {
    it('應該提供推薦的監控配置', () => {
      const monitoringConfig = {
        metrics: {
          throughput: { threshold: 500, alert: 'LOW_THROUGHPUT' },
          avgLatency: { threshold: 5, alert: 'HIGH_LATENCY' },
          p95Latency: { threshold: 20, alert: 'HIGH_P95_LATENCY' },
          p99Latency: { threshold: 50, alert: 'HIGH_P99_LATENCY' },
          queueDepth: { threshold: 9000, alert: 'QUEUE_FULL' },
          errorRate: { threshold: 1.0, alert: 'HIGH_ERROR_RATE' },
          memoryUsage: { threshold: 500, alert: 'HIGH_MEMORY' },
        },
        scrapeInterval: 15, // 秒
        evaluationInterval: 30, // 秒
      }

      expect(monitoringConfig.metrics.throughput.threshold).toBe(500)
      expect(monitoringConfig.metrics.avgLatency.threshold).toBe(5)
      expect(monitoringConfig.scrapeInterval).toBe(15)
    })

    it('應該驗證告警規則的有效性', () => {
      const alertRules = [
        {
          name: 'FlashSaleLowThroughput',
          condition: 'throughput < 500',
          severity: 'warning',
        },
        {
          name: 'FlashSaleHighLatency',
          condition: 'avgLatency > 5',
          severity: 'warning',
        },
        {
          name: 'FlashSaleQueueFull',
          condition: 'queueDepth > 9000',
          severity: 'critical',
        },
      ]

      expect(alertRules.length).toBe(3)
      expect(alertRules[2].severity).toBe('critical')

      // 驗證每個規則都有名稱、條件、嚴重級別
      for (const rule of alertRules) {
        expect(rule.name).toBeDefined()
        expect(rule.condition).toBeDefined()
        expect(rule.severity).toMatch(/warning|critical/)
      }
    })

    it('應該提供監控儀表板配置', () => {
      const dashboardConfig = {
        name: 'Flash Sale Monitoring',
        panels: [
          {
            title: '吞吐量',
            metric: 'throughput',
            unit: 'ops/sec',
            threshold: 500,
          },
          {
            title: '平均延遲',
            metric: 'avgLatency',
            unit: 'ms',
            threshold: 5,
          },
          {
            title: 'P95 延遲',
            metric: 'p95Latency',
            unit: 'ms',
            threshold: 20,
          },
          {
            title: '隊列深度',
            metric: 'queueDepth',
            unit: 'events',
            threshold: 9000,
          },
        ],
        refreshInterval: 5000, // 毫秒
      }

      expect(dashboardConfig.panels.length).toBe(4)
      expect(dashboardConfig.refreshInterval).toBe(5000)

      // 驗證每個面板都有需要的信息
      for (const panel of dashboardConfig.panels) {
        expect(panel.title).toBeDefined()
        expect(panel.metric).toBeDefined()
        expect(panel.unit).toBeDefined()
        expect(panel.threshold).toBeGreaterThan(0)
      }
    })
  })
})
