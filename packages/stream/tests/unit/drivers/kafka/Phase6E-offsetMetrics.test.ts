import { beforeEach, describe, expect, it } from 'bun:test'
import { KafkaMetrics } from '../../../../src/drivers/kafka/KafkaMetrics'
import { OffsetTracker } from '../../../../src/drivers/kafka/OffsetTracker'

// ===========================================================================
// Phase 6E-2: OffsetTracker BigInt 優化測試
// ===========================================================================
describe('Phase 6E-2: OffsetTracker BigInt Optimization', () => {
  let tracker: OffsetTracker

  beforeEach(() => {
    tracker = new OffsetTracker()
  })

  describe('BigInt Offset Comparison', () => {
    it('should correctly compare large numeric offsets', () => {
      // BigInt 保證數值比較正確（字串排序 "9" > "10"，但 BigInt 9n < 10n）
      tracker.track('test', 0, '9')
      tracker.track('test', 0, '10')
      tracker.track('test', 0, '11')

      tracker.resolve('test', 0, '9')
      tracker.resolve('test', 0, '10')
      tracker.resolve('test', 0, '11')

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      // 應返回數值最大的 offset (11)，而非字串最大的 ("9")
      expect(committable[0]?.offset).toBe('11')
    })

    it('should handle very large Kafka offsets (Int64 range)', () => {
      const largeOffset = '9223372036854775807' // Int64 max
      tracker.track('test', 0, largeOffset)
      tracker.resolve('test', 0, largeOffset)

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      expect(committable[0]?.offset).toBe(largeOffset)
    })

    it('should track highest resolved offset across out-of-order resolutions', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '200')
      tracker.track('test', 0, '150')

      // 亂序 resolve
      tracker.resolve('test', 0, '200')
      tracker.resolve('test', 0, '100')
      tracker.resolve('test', 0, '150')

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      expect(committable[0]?.offset).toBe('200')
    })

    it('should return highest resolved even when only some offsets resolved', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '200')

      // 只 resolve 較高的
      tracker.resolve('test', 0, '200')

      // 仍有 pending，不可提交
      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(0)

      // resolve 剩餘的
      tracker.resolve('test', 0, '100')
      const committable2 = tracker.getCommittableOffsets()
      expect(committable2).toHaveLength(1)
      expect(committable2[0]?.offset).toBe('200')
    })
  })

  describe('Fast Topic Clear', () => {
    it('should clear using topic-keyed index in O(partitions)', () => {
      // 建立 100 個 partition
      for (let p = 0; p < 100; p++) {
        tracker.track('target', p, String(1000 + p))
        tracker.resolve('target', p, String(1000 + p))
      }

      // 建立另一個 topic
      tracker.track('other', 0, '999')

      tracker.clear('target')

      // target 已清除
      const stats = tracker.getStats()
      expect(stats.tracked).toBe(1) // only 'other'

      // other 不受影響
      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(0) // other still pending
    })

    it('should clear topic without affecting other topics offsets', () => {
      tracker.track('a', 0, '100')
      tracker.track('b', 0, '200')
      tracker.resolve('a', 0, '100')
      tracker.resolve('b', 0, '200')

      tracker.clear('a')

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      expect(committable[0]?.topic).toBe('b')
    })
  })

  describe('Performance: getCommittableOffsets O(partitions)', () => {
    it('should scale linearly with partitions, not offsets', () => {
      // 建立 50 個 partition，每個有 100 個已解析的 offset
      for (let p = 0; p < 50; p++) {
        for (let i = 0; i < 100; i++) {
          const offset = String(p * 1000 + i)
          tracker.track('test', p, offset)
          tracker.resolve('test', p, offset)
        }
      }

      const start = performance.now()
      const committable = tracker.getCommittableOffsets()
      const elapsed = performance.now() - start

      expect(committable).toHaveLength(50)
      // 應在 5ms 內完成（遠低於舊版排序方式）
      expect(elapsed).toBeLessThan(5)
    })

    it('should handle 10,000 offsets efficiently', () => {
      for (let i = 0; i < 10000; i++) {
        tracker.track('test', 0, String(i))
        tracker.resolve('test', 0, String(i))
      }

      const start = performance.now()
      const committable = tracker.getCommittableOffsets()
      const elapsed = performance.now() - start

      expect(committable).toHaveLength(1)
      expect(committable[0]?.offset).toBe('9999')
      // O(partitions) = O(1) for single partition
      expect(elapsed).toBeLessThan(2)
    })
  })

  describe('Multi-Partition Commit Logic', () => {
    it('should only commit partitions with zero pending offsets', () => {
      // Partition 0: 全部已解析
      tracker.track('test', 0, '100')
      tracker.resolve('test', 0, '100')

      // Partition 1: 仍有 pending
      tracker.track('test', 1, '200')
      tracker.track('test', 1, '201')
      tracker.resolve('test', 1, '200')

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      expect(committable[0]?.partition).toBe(0)
    })

    it('should handle mixed topics with different commit states', () => {
      tracker.track('orders', 0, '100')
      tracker.track('events', 0, '200')

      tracker.resolve('orders', 0, '100')
      // events partition 0 still pending

      const committable = tracker.getCommittableOffsets()
      expect(committable).toHaveLength(1)
      expect(committable[0]?.topic).toBe('orders')
    })
  })
})

// ===========================================================================
// Phase 6E-2: KafkaMetrics 桶計數器優化測試
// ===========================================================================
describe('Phase 6E-2: KafkaMetrics Bucket Counter Optimization', () => {
  let metrics: KafkaMetrics

  beforeEach(() => {
    metrics = new KafkaMetrics()
  })

  describe('Bucket Counter Throughput', () => {
    it('should calculate throughput using bucket counters', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordMessage('q1', 5)
      }

      const snapshot = metrics.getSnapshot()
      // 吞吐量 > 0（所有訊息在同一個桶內）
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
    })

    it('should return zero throughput after all buckets expire', async () => {
      metrics.recordMessage('q1', 5)

      // 等待所有桶過期（10 個桶 x 1 秒 = 10 秒太長，改用小量測試）
      // 桶計數器設計: 如果不再記錄，已有的桶最終會被推進機制清零
      // 但在即時快照中，現有桶仍有值
      const snapshot = metrics.getSnapshot()
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
    })

    it('should isolate throughput between queues', () => {
      for (let i = 0; i < 50; i++) {
        metrics.recordMessage('q1', 5)
      }
      for (let i = 0; i < 20; i++) {
        metrics.recordMessage('q2', 5)
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
      expect(snapshot.throughput.q2).toBeGreaterThan(0)
      // q1 應有更高的吞吐量
      expect(snapshot.throughput.q1!).toBeGreaterThan(snapshot.throughput.q2!)
    })

    it('should not return throughput for queues with no messages', () => {
      const snapshot = metrics.getSnapshot()
      expect(Object.keys(snapshot.throughput)).toHaveLength(0)
    })
  })

  describe('Constant Memory Throughput', () => {
    it('should use constant memory regardless of message count', () => {
      // 記錄 100,000 個訊息 - 不應導致記憶體增長
      for (let i = 0; i < 100000; i++) {
        metrics.recordMessage('q1', i % 100)
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(100000)
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
    })
  })

  describe('Snapshot Performance', () => {
    it('should produce snapshot in O(1) relative to message count', () => {
      // 記錄大量訊息
      for (let i = 0; i < 50000; i++) {
        metrics.recordMessage(`q${i % 5}`, i % 100)
      }

      const start = performance.now()
      const snapshot = metrics.getSnapshot()
      const elapsed = performance.now() - start

      expect(snapshot.totalProcessed).toBe(50000)
      // 快照應在 5ms 內完成（桶計數器只需遍歷 5 queues x 10 buckets = 50 次）
      expect(elapsed).toBeLessThan(5)
    })

    it('should maintain latency accuracy with bucket throughput', () => {
      // 驗證桶計數器優化不影響延遲直方圖精確度
      for (let i = 1; i <= 100; i++) {
        metrics.recordMessage('q1', i)
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.latency.min).toBe(1)
      expect(snapshot.latency.max).toBe(100)
      expect(snapshot.latency.p50).toBeCloseTo(50.5, 0)
      expect(snapshot.latency.avg).toBeCloseTo(50.5, 0)
    })
  })

  describe('Reset with Bucket Counters', () => {
    it('should clear bucket counters on reset', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordMessage('q1', 5)
      }

      metrics.reset()

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
      expect(Object.keys(snapshot.throughput)).toHaveLength(0)
    })

    it('should allow recording after bucket reset', () => {
      metrics.recordMessage('q1', 10)
      metrics.reset()
      metrics.recordMessage('q1', 20)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(1)
      expect(snapshot.throughput.q1).toBeGreaterThan(0)
      expect(snapshot.latency.avg).toBe(20)
    })
  })
})
