import { beforeEach, describe, expect, it } from 'bun:test'
import { KafkaMetrics } from '../../../../src/drivers/kafka/KafkaMetrics'

describe('KafkaMetrics', () => {
  let metrics: KafkaMetrics

  beforeEach(() => {
    metrics = new KafkaMetrics()
  })

  describe('Construction', () => {
    it('should create with default config', () => {
      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
      expect(snapshot.totalFailed).toBe(0)
      expect(snapshot.inFlight).toBe(0)
    })

    it('should respect enabled=false config', () => {
      const disabled = new KafkaMetrics({ enabled: false })
      disabled.recordMessage('q1', 10)
      disabled.recordError('callback')
      disabled.recordRateLimitHit('q1', true)

      const snapshot = disabled.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
      expect(snapshot.totalFailed).toBe(0)
    })

    it('should accept custom histogram size', () => {
      const custom = new KafkaMetrics({ histogramSize: 5 })
      // 寫入 7 個值（超過 5 的容量）
      for (let i = 1; i <= 7; i++) {
        custom.recordMessage('q1', i * 10)
      }
      const snapshot = custom.getSnapshot()
      // 應仍然能正確取得快照（圓形緩衝區溢位處理）
      expect(snapshot.totalProcessed).toBe(7)
      expect(snapshot.latency.max).toBeGreaterThan(0)
    })
  })

  describe('Message Recording', () => {
    it('should count messages per queue', () => {
      metrics.recordMessage('q1', 10)
      metrics.recordMessage('q1', 20)
      metrics.recordMessage('q2', 30)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(3)
    })

    it('should isolate per-queue counts', () => {
      metrics.recordMessage('q1', 10)
      metrics.recordMessage('q1', 20)
      metrics.recordMessage('q2', 30)

      const snapshot = metrics.getSnapshot()
      // 吞吐量應該在兩個佇列都有
      expect(snapshot.throughput).toHaveProperty('q1')
      expect(snapshot.throughput).toHaveProperty('q2')
    })

    it('should track total processed count', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordMessage('q1', i)
      }
      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(100)
    })
  })

  describe('Throughput Calculation', () => {
    it('should calculate messages per second', () => {
      // 記錄訊息
      metrics.recordMessage('q1', 5)
      metrics.recordMessage('q1', 5)
      metrics.recordMessage('q1', 5)

      const snapshot = metrics.getSnapshot()
      // 吞吐量應該大於 0
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
    })

    it('should separate throughput by queue', () => {
      metrics.recordMessage('q1', 5)
      metrics.recordMessage('q1', 5)
      metrics.recordMessage('q2', 10)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.throughput.q1).toBeDefined()
      expect(snapshot.throughput.q2).toBeDefined()
    })

    it('should return zero throughput for queues with no messages', () => {
      const snapshot = metrics.getSnapshot()
      expect(Object.keys(snapshot.throughput)).toHaveLength(0)
    })
  })

  describe('Error Tracking', () => {
    it('should track errors by type', () => {
      metrics.recordError('serialization')
      metrics.recordError('serialization')
      metrics.recordError('callback')
      metrics.recordError('connection')
      metrics.recordError('timeout')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.serialization).toBe(2)
      expect(snapshot.errors.callback).toBe(1)
      expect(snapshot.errors.connection).toBe(1)
      expect(snapshot.errors.timeout).toBe(1)
      expect(snapshot.errors.total).toBe(5)
    })

    it('should count errors in totalFailed', () => {
      metrics.recordError('callback')
      metrics.recordError('timeout')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalFailed).toBe(2)
    })

    it('should handle many errors without overflow', () => {
      for (let i = 0; i < 10000; i++) {
        metrics.recordError('callback')
      }
      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.callback).toBe(10000)
      expect(snapshot.errors.total).toBe(10000)
      expect(snapshot.totalFailed).toBe(10000)
    })
  })

  describe('Latency Histogram', () => {
    it('should calculate p50 for known data', () => {
      // 已知資料集：[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      for (let i = 1; i <= 10; i++) {
        metrics.recordMessage('q1', i * 10)
      }

      const snapshot = metrics.getSnapshot()
      // p50 = 第 50 百分位 = ~55 (線性插值)
      expect(snapshot.latency.p50).toBeCloseTo(55, 0)
    })

    it('should calculate p95 for known data', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordMessage('q1', i)
      }

      const snapshot = metrics.getSnapshot()
      // p95 在 100 筆 1-100 資料中，應接近 95.5
      expect(snapshot.latency.p95).toBeCloseTo(95.5, 0)
    })

    it('should calculate p99 for known data', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordMessage('q1', i)
      }

      const snapshot = metrics.getSnapshot()
      // p99 在 100 筆 1-100 資料中，應接近 99.5 (99% of 99 = index 98.01)
      expect(snapshot.latency.p99).toBeCloseTo(99.01, 0)
    })

    it('should compute correct min and max', () => {
      metrics.recordMessage('q1', 5)
      metrics.recordMessage('q1', 100)
      metrics.recordMessage('q1', 50)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.latency.min).toBe(5)
      expect(snapshot.latency.max).toBe(100)
    })

    it('should compute correct average', () => {
      metrics.recordMessage('q1', 10)
      metrics.recordMessage('q1', 20)
      metrics.recordMessage('q1', 30)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.latency.avg).toBe(20)
    })

    it('should return zeros when no latency data', () => {
      const snapshot = metrics.getSnapshot()
      expect(snapshot.latency.p50).toBe(0)
      expect(snapshot.latency.p95).toBe(0)
      expect(snapshot.latency.p99).toBe(0)
      expect(snapshot.latency.avg).toBe(0)
      expect(snapshot.latency.min).toBe(0)
      expect(snapshot.latency.max).toBe(0)
    })

    it('should handle single data point', () => {
      metrics.recordMessage('q1', 42)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.latency.p50).toBe(42)
      expect(snapshot.latency.avg).toBe(42)
      expect(snapshot.latency.min).toBe(42)
      expect(snapshot.latency.max).toBe(42)
    })
  })

  describe('Circular Buffer Overflow', () => {
    it('should handle overflow correctly with small histogram', () => {
      const small = new KafkaMetrics({ histogramSize: 5 })

      // 寫入 8 個值：1, 2, 3, 4, 5, 6, 7, 8
      // 圓形緩衝區保留最後 5 個：4, 5, 6, 7, 8
      // (index 0-4 被覆蓋: buffer = [6, 7, 8, 4, 5])
      for (let i = 1; i <= 8; i++) {
        small.recordMessage('q1', i)
      }

      const snapshot = small.getSnapshot()
      expect(snapshot.latency.min).toBe(4)
      expect(snapshot.latency.max).toBe(8)
      expect(snapshot.latency.avg).toBe(6) // (4+5+6+7+8)/5 = 6
    })

    it('should maintain accuracy with large overflow', () => {
      const small = new KafkaMetrics({ histogramSize: 10 })

      // 寫入 1000 個值
      for (let i = 1; i <= 1000; i++) {
        small.recordMessage('q1', i)
      }

      const snapshot = small.getSnapshot()
      // 只保留最後 10 個：991-1000
      expect(snapshot.latency.min).toBe(991)
      expect(snapshot.latency.max).toBe(1000)
      expect(snapshot.totalProcessed).toBe(1000)
    })
  })

  describe('Buffer Utilization', () => {
    it('should track per-queue buffer sizes', () => {
      metrics.updateBufferSize('q1', 50, 100)
      metrics.updateBufferSize('q2', 30, 100)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.perQueue.q1).toBe(50)
      expect(snapshot.buffer.perQueue.q2).toBe(30)
      expect(snapshot.buffer.totalSize).toBe(80)
    })

    it('should calculate utilization as 0-1', () => {
      metrics.updateBufferSize('q1', 75, 100)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.utilization).toBe(0.75)
    })

    it('should clamp utilization to 0-1', () => {
      metrics.updateBufferSize('q1', 200, 100)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.utilization).toBe(1)
    })

    it('should return 0 utilization when capacity is 0', () => {
      metrics.updateBufferSize('q1', 0, 0)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.utilization).toBe(0)
    })
  })

  describe('Rate Limit Tracking', () => {
    it('should track allowed and denied per queue', () => {
      metrics.recordRateLimitHit('q1', true)
      metrics.recordRateLimitHit('q1', true)
      metrics.recordRateLimitHit('q1', false)
      metrics.recordRateLimitHit('q2', false)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.rateLimits.perQueue.q1).toEqual({
        allowed: 2,
        denied: 1,
      })
      expect(snapshot.rateLimits.perQueue.q2).toEqual({
        allowed: 0,
        denied: 1,
      })
    })

    it('should track total allowed and denied', () => {
      metrics.recordRateLimitHit('q1', true)
      metrics.recordRateLimitHit('q1', false)
      metrics.recordRateLimitHit('q2', true)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.rateLimits.totalAllowed).toBe(2)
      expect(snapshot.rateLimits.totalDenied).toBe(1)
    })
  })

  describe('In-Flight Tracking', () => {
    it('should track in-flight count', () => {
      metrics.setInFlight(5)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.inFlight).toBe(5)
    })

    it('should update in-flight count', () => {
      metrics.setInFlight(5)
      metrics.setInFlight(3)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.inFlight).toBe(3)
    })
  })

  describe('Consumer Lag', () => {
    it('should track lag per topic-partition', () => {
      metrics.updateLag('topic1-0', 100)
      metrics.updateLag('topic1-1', 200)
      metrics.updateLag('topic2-0', 50)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.lag['topic1-0']).toBe(100)
      expect(snapshot.lag['topic1-1']).toBe(200)
      expect(snapshot.lag['topic2-0']).toBe(50)
    })

    it('should update lag values', () => {
      metrics.updateLag('topic1-0', 100)
      metrics.updateLag('topic1-0', 50)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.lag['topic1-0']).toBe(50)
    })
  })

  describe('getSnapshot()', () => {
    it('should return immutable snapshot', () => {
      metrics.recordMessage('q1', 10)
      metrics.recordError('callback')

      const snapshot1 = metrics.getSnapshot()
      const snapshot1Total = snapshot1.totalProcessed

      // 修改 snapshot 不應影響內部狀態
      snapshot1.errors.callback = 999

      metrics.recordMessage('q1', 20)
      const snapshot2 = metrics.getSnapshot()

      expect(snapshot2.errors.callback).toBe(1) // 未被 snapshot1 的修改影響
      expect(snapshot2.totalProcessed).toBe(snapshot1Total + 1)
    })

    it('should include timestamp', () => {
      const before = Date.now()
      const snapshot = metrics.getSnapshot()
      const after = Date.now()

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before)
      expect(snapshot.timestamp).toBeLessThanOrEqual(after)
    })

    it('should return complete structure with all fields', () => {
      const snapshot = metrics.getSnapshot()

      expect(snapshot).toHaveProperty('timestamp')
      expect(snapshot).toHaveProperty('throughput')
      expect(snapshot).toHaveProperty('lag')
      expect(snapshot).toHaveProperty('errors')
      expect(snapshot).toHaveProperty('latency')
      expect(snapshot).toHaveProperty('buffer')
      expect(snapshot).toHaveProperty('rateLimits')
      expect(snapshot).toHaveProperty('inFlight')
      expect(snapshot).toHaveProperty('totalProcessed')
      expect(snapshot).toHaveProperty('totalFailed')
    })
  })

  describe('reset()', () => {
    it('should clear all counters', () => {
      metrics.recordMessage('q1', 10)
      metrics.recordMessage('q2', 20)
      metrics.recordError('callback')
      metrics.recordRateLimitHit('q1', true)
      metrics.updateBufferSize('q1', 50, 100)
      metrics.updateLag('topic-0', 100)
      metrics.setInFlight(5)

      metrics.reset()

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
      expect(snapshot.totalFailed).toBe(0)
      expect(snapshot.inFlight).toBe(0)
      expect(snapshot.errors.total).toBe(0)
      expect(snapshot.errors.callback).toBe(0)
      expect(snapshot.rateLimits.totalAllowed).toBe(0)
      expect(snapshot.rateLimits.totalDenied).toBe(0)
      expect(Object.keys(snapshot.throughput)).toHaveLength(0)
      expect(Object.keys(snapshot.lag)).toHaveLength(0)
      expect(snapshot.buffer.totalSize).toBe(0)
      expect(snapshot.buffer.utilization).toBe(0)
      expect(snapshot.latency.avg).toBe(0)
    })

    it('should allow recording after reset', () => {
      metrics.recordMessage('q1', 10)
      metrics.reset()
      metrics.recordMessage('q1', 20)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(1)
      expect(snapshot.latency.avg).toBe(20)
    })
  })

  describe('Large-Scale Accuracy', () => {
    it('should maintain accuracy after 10,000+ messages', () => {
      for (let i = 0; i < 10000; i++) {
        metrics.recordMessage('q1', 50 + (i % 100))
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(10000)
      // 延遲計算仍然有效（使用圓形緩衝區最後 100 個值）
      expect(snapshot.latency.min).toBeGreaterThanOrEqual(50)
      expect(snapshot.latency.max).toBeLessThanOrEqual(149)
      expect(snapshot.latency.avg).toBeGreaterThan(0)
    })

    it('should handle high-frequency mixed operations', () => {
      for (let i = 0; i < 5000; i++) {
        metrics.recordMessage(`q${i % 10}`, i % 100)
        if (i % 50 === 0) metrics.recordError('callback')
        if (i % 30 === 0) metrics.recordRateLimitHit(`q${i % 10}`, i % 2 === 0)
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(5000)
      expect(snapshot.errors.callback).toBe(100) // 5000/50
      expect(snapshot.rateLimits.totalAllowed + snapshot.rateLimits.totalDenied).toBe(167) // ceil(5000/30)
    })
  })

  describe('Concurrent recordMessage', () => {
    it('should handle parallel recordMessage calls', async () => {
      const promises: Promise<void>[] = []

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            metrics.recordMessage('q1', i)
            resolve()
          }),
        )
      }

      await Promise.all(promises)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(100)
    })
  })
})
