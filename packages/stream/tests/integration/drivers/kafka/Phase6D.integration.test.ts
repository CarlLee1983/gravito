import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureController } from '../../../../src/drivers/kafka/BackpressureController'
import { ErrorRecoveryManager } from '../../../../src/drivers/kafka/ErrorRecoveryManager'
import { HeartbeatManager } from '../../../../src/drivers/kafka/HeartbeatManager'
import { KafkaMetrics } from '../../../../src/drivers/kafka/KafkaMetrics'
import { RateLimiter } from '../../../../src/drivers/kafka/RateLimiter'
import { RebalanceHandler } from '../../../../src/drivers/kafka/RebalanceHandler'
import type {
  HeartbeatStatus,
  PartitionAssignment,
  RebalanceEvent,
} from '../../../../src/drivers/kafka/types'

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

/**
 * 模擬訊息處理流程：rate limit check → callback → metrics → heartbeat。
 * 回傳 latency (ms)。
 */
function simulateMessageProcessing(
  queue: string,
  opts: {
    rateLimiter: RateLimiter
    rateConfig: { max: number; duration: number }
    metrics: KafkaMetrics
    heartbeat: HeartbeatManager
    callbackLatencyMs?: number
    shouldFail?: boolean
  }
): { allowed: boolean; latencyMs: number; error?: string } {
  // 1. Rate limit check
  const allowed = opts.rateLimiter.check(queue, opts.rateConfig)
  opts.metrics.recordRateLimitHit(queue, allowed)

  if (!allowed) {
    return { allowed: false, latencyMs: 0 }
  }

  // 2. Simulate callback execution
  const latencyMs = opts.callbackLatencyMs ?? 5

  if (opts.shouldFail) {
    opts.metrics.recordError('callback')
    return { allowed: true, latencyMs, error: 'callback failed' }
  }

  // 3. Record success metrics + heartbeat
  opts.metrics.recordMessage(queue, latencyMs)
  opts.heartbeat.beat()

  return { allowed: true, latencyMs }
}

// ---------------------------------------------------------------------------
// 整合測試
// ---------------------------------------------------------------------------

describe('Phase 6D Integration Tests', () => {
  let rateLimiter: RateLimiter
  let heartbeat: HeartbeatManager
  let metrics: KafkaMetrics
  let recovery: ErrorRecoveryManager

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    heartbeat = new HeartbeatManager({ interval: 50, maxMissed: 3 })
    metrics = new KafkaMetrics()
    recovery = new ErrorRecoveryManager({
      failureThreshold: 3,
      resetTimeoutMs: 100,
      halfOpenMaxRequests: 1,
      initialBackoffMs: 10,
      maxBackoffMs: 200,
      backoffMultiplier: 2,
      jitter: false,
      maxRetries: 5,
    })
  })

  afterEach(async () => {
    await heartbeat.stop()
    recovery.destroy()
  })

  // =========================================================================
  // Scenario 1: 完整訊息流（正常路徑）
  // =========================================================================
  describe('Scenario 1: Complete message flow (happy path)', () => {
    it('should process message through rate limit → callback → metrics → heartbeat', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      const rateConfig = { max: 100, duration: 1000 }
      const result = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
        callbackLatencyMs: 10,
      })

      expect(result.allowed).toBe(true)
      expect(result.latencyMs).toBe(10)
      expect(result.error).toBeUndefined()

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(1)
      expect(snapshot.totalFailed).toBe(0)
      expect(snapshot.rateLimits.totalAllowed).toBe(1)
      expect(snapshot.rateLimits.totalDenied).toBe(0)
      expect(snapshot.latency.avg).toBe(10)

      const hbStatus = heartbeat.getStatus()
      expect(hbStatus.isAlive).toBe(true)
      expect(hbStatus.missedCount).toBe(0)
    })

    it('should process multiple messages and track cumulative metrics', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      const rateConfig = { max: 1000, duration: 1000 }
      for (let i = 0; i < 50; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 5 + (i % 20),
        })
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(50)
      expect(snapshot.totalFailed).toBe(0)
      expect(snapshot.rateLimits.totalAllowed).toBe(50)
      expect(snapshot.latency.min).toBe(5)
      expect(snapshot.latency.max).toBe(24) // 5 + 19
      expect(snapshot.latency.avg).toBeGreaterThan(0)
      expect(snapshot.throughput.orders).toBeGreaterThan(0)
    })

    it('should handle multi-queue processing with isolated metrics', async () => {
      await heartbeat.start('consumer-1', ['orders', 'events'])

      const rateConfig = { max: 100, duration: 1000 }

      for (let i = 0; i < 20; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 10,
        })
      }

      for (let i = 0; i < 30; i++) {
        simulateMessageProcessing('events', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 20,
        })
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(50)
      expect(snapshot.rateLimits.perQueue.orders?.allowed).toBe(20)
      expect(snapshot.rateLimits.perQueue.events?.allowed).toBe(30)
      expect(snapshot.throughput.orders).toBeGreaterThan(0)
      expect(snapshot.throughput.events).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // Scenario 2: 速率限制觸發
  // =========================================================================
  describe('Scenario 2: Rate limiting enforcement', () => {
    it('should deny messages when rate limit exceeded and track in metrics', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      const rateConfig = { max: 5, duration: 1000 }

      // 先處理 5 個允許的訊息
      for (let i = 0; i < 5; i++) {
        const result = simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
        })
        expect(result.allowed).toBe(true)
      }

      // 第 6 個應被拒絕
      const denied = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      expect(denied.allowed).toBe(false)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(5)
      expect(snapshot.rateLimits.totalAllowed).toBe(5)
      expect(snapshot.rateLimits.totalDenied).toBe(1)
      expect(snapshot.rateLimits.perQueue.orders?.denied).toBe(1)
    })

    it('should enforce different rate limits per queue', async () => {
      await heartbeat.start('consumer-1', ['fast', 'slow'])

      const fastConfig = { max: 10, duration: 1000 }
      const slowConfig = { max: 2, duration: 1000 }

      // fast 佇列: 10 個允許
      for (let i = 0; i < 12; i++) {
        simulateMessageProcessing('fast', {
          rateLimiter,
          rateConfig: fastConfig,
          metrics,
          heartbeat,
        })
      }

      // slow 佇列: 2 個允許
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('slow', {
          rateLimiter,
          rateConfig: slowConfig,
          metrics,
          heartbeat,
        })
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.rateLimits.perQueue.fast?.allowed).toBe(10)
      expect(snapshot.rateLimits.perQueue.fast?.denied).toBe(2)
      expect(snapshot.rateLimits.perQueue.slow?.allowed).toBe(2)
      expect(snapshot.rateLimits.perQueue.slow?.denied).toBe(3)
      expect(snapshot.totalProcessed).toBe(12) // 10 fast + 2 slow
    })

    it('should allow messages after rate limit window expires', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      const rateConfig = { max: 2, duration: 50 }

      // 耗盡配額
      simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })

      // 第 3 個被拒
      const denied = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      expect(denied.allowed).toBe(false)

      // 等待窗口過期
      await new Promise((resolve) => setTimeout(resolve, 80))

      // 現在應允許
      const allowed = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      expect(allowed.allowed).toBe(true)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(3) // 2 + 1
      expect(snapshot.rateLimits.totalDenied).toBe(1)
    })
  })

  // =========================================================================
  // Scenario 3: 錯誤恢復與電路斷路器
  // =========================================================================
  describe('Scenario 3: Error recovery with circuit breaker', () => {
    it('should open circuit after consecutive failures and track errors', () => {
      const rateConfig = { max: 100, duration: 1000 }

      for (let i = 0; i < 3; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          shouldFail: true,
        })
        recovery.recordFailure(new Error('processing failed'))
      }

      expect(recovery.getState().circuitState).toBe('OPEN')
      expect(recovery.canProceed()).toBe(false)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.callback).toBe(3)
      expect(snapshot.totalFailed).toBe(3)
      expect(snapshot.totalProcessed).toBe(0) // 失敗的不計入 processed
    })

    it('should recover through HALF_OPEN → CLOSED after probe success', async () => {
      const rateConfig = { max: 100, duration: 1000 }

      // 觸發電路打開
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
        metrics.recordError('callback')
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(recovery.getState().circuitState).toBe('HALF_OPEN')
      expect(recovery.canProceed()).toBe(true)

      // 模擬探測成功
      simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      recovery.recordSuccess()

      expect(recovery.getState().circuitState).toBe('CLOSED')
      expect(recovery.canProceed()).toBe(true)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(1)
      expect(snapshot.totalFailed).toBe(3)
    })

    it('should re-open circuit when HALF_OPEN probe fails', async () => {
      // 觸發電路打開
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(recovery.getState().circuitState).toBe('HALF_OPEN')

      // 探測失敗
      recovery.recordFailure(new Error('probe failed'))
      expect(recovery.getState().circuitState).toBe('OPEN')
      expect(recovery.canProceed()).toBe(false)
    })

    it('should block processing when circuit is OPEN', () => {
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }

      // 電路開啟，canProceed 應返回 false
      expect(recovery.canProceed()).toBe(false)

      // 嘗試處理訊息 - 應在電路檢查前被攔截
      const allowed = recovery.canProceed()
      expect(allowed).toBe(false)
    })

    it('should track recovery count across multiple failure-recovery cycles', async () => {
      // 第一次故障循環
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
      recovery.recordSuccess()
      expect(recovery.getState().totalRecoveries).toBe(1)

      // 第二次故障循環
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
      recovery.recordSuccess()
      expect(recovery.getState().totalRecoveries).toBe(2)
      expect(recovery.getState().circuitState).toBe('CLOSED')
    })
  })

  // =========================================================================
  // Scenario 4: 心跳與錯誤恢復互動
  // =========================================================================
  describe('Scenario 4: Heartbeat and error recovery interaction', () => {
    it('should keep heartbeat alive during normal processing', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      const rateConfig = { max: 100, duration: 1000 }

      // 正常處理訊息，每次都會 beat()
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
        })
      }

      const status = heartbeat.getStatus()
      expect(status.isAlive).toBe(true)
      expect(status.missedCount).toBe(0)
    })

    it('should detect stale consumer when circuit is OPEN (no processing)', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      // 觸發電路打開 - 停止處理
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      expect(recovery.canProceed()).toBe(false)

      // 不呼叫 heartbeat.beat()，等待心跳間隔多次
      await new Promise((resolve) => setTimeout(resolve, 200))

      const status = heartbeat.getStatus()
      // 心跳間隔 50ms，等了 200ms，至少遺漏 3 次以上
      expect(status.missedCount).toBeGreaterThanOrEqual(3)
      expect(status.isAlive).toBe(false)
    })

    it('should emit stale event when heartbeat missed threshold reached', async () => {
      const staleEvents: HeartbeatStatus[] = []
      heartbeat.on('stale', (status: HeartbeatStatus) => {
        staleEvents.push(status)
      })

      await heartbeat.start('consumer-1', ['orders'])

      // 等待足夠的時間讓 missedCount >= maxMissed (3)
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(staleEvents.length).toBeGreaterThanOrEqual(1)
      expect(staleEvents[0]?.isAlive).toBe(false)
    })

    it('should recover heartbeat after circuit closes and processing resumes', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      // 觸發電路打開
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 探測成功 → 恢復
      recovery.recordSuccess()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 恢復處理 → 心跳恢復
      const rateConfig = { max: 100, duration: 1000 }
      simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })

      const status = heartbeat.getStatus()
      expect(status.missedCount).toBe(0)
    })
  })

  // =========================================================================
  // Scenario 5: 背壓與指標互動
  // =========================================================================
  describe('Scenario 5: Backpressure and metrics interaction', () => {
    it('should track buffer utilization in metrics during backpressure', () => {
      const backpressure = new BackpressureController(100, {
        highWatermark: 0.8,
        lowWatermark: 0.5,
      })

      // 模擬緩衝區填充
      metrics.updateBufferSize('orders', 85, 100)
      backpressure.evaluate(85, ['orders'])

      expect(backpressure.isPaused()).toBe(true)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.perQueue.orders).toBe(85)
      expect(snapshot.buffer.utilization).toBe(0.85)
    })

    it('should resume and update metrics when buffer drains', () => {
      const backpressure = new BackpressureController(100, {
        highWatermark: 0.8,
        lowWatermark: 0.5,
      })

      // 觸發暫停
      metrics.updateBufferSize('orders', 85, 100)
      backpressure.evaluate(85, ['orders'])
      expect(backpressure.isPaused()).toBe(true)

      // 模擬排空
      metrics.updateBufferSize('orders', 40, 100)
      backpressure.evaluate(40, ['orders'])
      expect(backpressure.isPaused()).toBe(false)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.perQueue.orders).toBe(40)
      expect(snapshot.buffer.utilization).toBe(0.4)
    })

    it('should track in-flight count during concurrent processing', () => {
      const backpressure = new BackpressureController(100, {
        maxInFlight: 3,
      })

      // 取得 3 個 slot
      expect(backpressure.acquireSlot()).toBe(true)
      expect(backpressure.acquireSlot()).toBe(true)
      expect(backpressure.acquireSlot()).toBe(true)
      metrics.setInFlight(3)

      // 第 4 個被拒
      expect(backpressure.acquireSlot()).toBe(false)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.inFlight).toBe(3)

      // 釋放一個
      backpressure.releaseSlot()
      metrics.setInFlight(2)

      // 現在可以再取一個
      expect(backpressure.acquireSlot()).toBe(true)
      metrics.setInFlight(3)

      const snapshot2 = metrics.getSnapshot()
      expect(snapshot2.inFlight).toBe(3)
    })
  })

  // =========================================================================
  // Scenario 6: 全元件壓力測試
  // =========================================================================
  describe('Scenario 6: High throughput stress test', () => {
    it('should maintain accuracy with 10,000 messages across all components', async () => {
      await heartbeat.start('consumer-1', ['orders', 'events'])

      const rateConfig = { max: 100000, duration: 10000 } // 不限制
      let successCount = 0
      let failCount = 0
      let _deniedCount = 0

      for (let i = 0; i < 10000; i++) {
        const queue = i % 2 === 0 ? 'orders' : 'events'
        const shouldFail = i % 100 === 0 // 每 100 個失敗一次

        if (shouldFail) {
          simulateMessageProcessing(queue, {
            rateLimiter,
            rateConfig,
            metrics,
            heartbeat,
            shouldFail: true,
          })
          recovery.recordFailure(new Error('test'))
          failCount++

          // 立即恢復以繼續處理（測試用）
          if (recovery.getState().circuitState === 'OPEN') {
            recovery.reset()
          }
        } else {
          const result = simulateMessageProcessing(queue, {
            rateLimiter,
            rateConfig,
            metrics,
            heartbeat,
            callbackLatencyMs: 1 + (i % 50),
          })
          if (result.allowed) {
            successCount++
          } else {
            _deniedCount++
          }
        }
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(successCount)
      expect(snapshot.totalFailed).toBe(failCount)
      expect(snapshot.totalProcessed + snapshot.totalFailed).toBe(10000)

      // 延遲統計應合理
      expect(snapshot.latency.min).toBeGreaterThanOrEqual(1)
      expect(snapshot.latency.max).toBeLessThanOrEqual(50)
      expect(snapshot.latency.avg).toBeGreaterThan(0)
      expect(snapshot.latency.p50).toBeGreaterThan(0)
      expect(snapshot.latency.p95).toBeGreaterThan(snapshot.latency.p50)

      // 心跳仍然活躍
      const status = heartbeat.getStatus()
      expect(status.isAlive).toBe(true)
    })

    it('should handle rate-limited high throughput with metrics consistency', () => {
      const rateConfig = { max: 50, duration: 1000 }
      let processed = 0
      let denied = 0

      for (let i = 0; i < 200; i++) {
        const result = simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 2,
        })

        if (result.allowed) {
          processed++
        } else {
          denied++
        }
      }

      expect(processed).toBe(50) // 被限制在 50
      expect(denied).toBe(150)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(50)
      expect(snapshot.rateLimits.totalAllowed).toBe(50)
      expect(snapshot.rateLimits.totalDenied).toBe(150)
    })
  })

  // =========================================================================
  // Scenario 7: 錯誤恢復 + 速率限制 + 指標一致性
  // =========================================================================
  describe('Scenario 7: Error recovery + rate limiting + metrics consistency', () => {
    it('should correctly count when rate-limited messages hit circuit breaker', () => {
      const rateConfig = { max: 10, duration: 1000 }

      // 先消耗 rate limit 配額（全部失敗）
      for (let i = 0; i < 10; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          shouldFail: true,
        })
        recovery.recordFailure(new Error('fail'))
      }

      // 3 次失敗後電路應打開
      expect(recovery.getState().circuitState).toBe('OPEN')
      expect(recovery.getState().consecutiveFailures).toBe(10)

      // 超出速率的訊息被拒
      const denied = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      expect(denied.allowed).toBe(false)

      const snapshot = metrics.getSnapshot()
      // 10 個 allowed + 1 個 denied
      expect(snapshot.rateLimits.totalAllowed).toBe(10)
      expect(snapshot.rateLimits.totalDenied).toBe(1)
      expect(snapshot.totalFailed).toBe(10)
      expect(snapshot.errors.callback).toBe(10)
    })

    it('should maintain metrics integrity after reset and recovery', async () => {
      // 故障循環
      for (let i = 0; i < 3; i++) {
        metrics.recordError('connection')
        recovery.recordFailure(new Error('connection lost'))
      }

      expect(recovery.getState().circuitState).toBe('OPEN')
      expect(metrics.getSnapshot().errors.connection).toBe(3)

      // 等待恢復
      await new Promise((resolve) => setTimeout(resolve, 150))
      recovery.recordSuccess()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 指標不應被恢復清除 - 它們是累計的
      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.connection).toBe(3)
      expect(snapshot.totalFailed).toBe(3)

      // 新的成功訊息會加到累計計數上
      metrics.recordMessage('orders', 5)
      const snapshot2 = metrics.getSnapshot()
      expect(snapshot2.totalProcessed).toBe(1)
      expect(snapshot2.totalFailed).toBe(3)
    })
  })

  // =========================================================================
  // Scenario 8: 背壓 + 電路斷路器級聯場景
  // =========================================================================
  describe('Scenario 8: Backpressure + circuit breaker cascade', () => {
    it('should handle backpressure pause during circuit open state', () => {
      const backpressure = new BackpressureController(100, {
        highWatermark: 0.8,
        lowWatermark: 0.5,
        maxInFlight: 5,
      })

      const pausedTopics: string[][] = []
      const resumedTopics: string[][] = []
      backpressure.onBackpressure({
        pause: (topics) => pausedTopics.push(topics),
        resume: (topics) => resumedTopics.push(topics),
      })

      // 電路打開（停止處理）
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      expect(recovery.canProceed()).toBe(false)

      // 同時緩衝區達到高水位
      backpressure.evaluate(85, ['orders'])
      expect(backpressure.isPaused()).toBe(true)
      expect(pausedTopics).toHaveLength(1)

      metrics.updateBufferSize('orders', 85, 100)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.buffer.utilization).toBe(0.85)
    })

    it('should coordinate resume after both backpressure and circuit resolve', async () => {
      const backpressure = new BackpressureController(100, {
        highWatermark: 0.8,
        lowWatermark: 0.5,
      })

      // 觸發背壓
      backpressure.evaluate(90, ['orders'])
      expect(backpressure.isPaused()).toBe(true)

      // 同時電路打開
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }

      // 緩衝區排空
      backpressure.evaluate(30, ['orders'])
      expect(backpressure.isPaused()).toBe(false)

      // 電路仍然打開
      expect(recovery.canProceed()).toBe(false)

      // 等待電路轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(recovery.canProceed()).toBe(true)

      // 探測成功
      recovery.recordSuccess()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 兩者都恢復後可以正常處理
      expect(backpressure.isPaused()).toBe(false)
      expect(recovery.canProceed()).toBe(true)
    })
  })

  // =========================================================================
  // Scenario 9: 多佇列並行處理
  // =========================================================================
  describe('Scenario 9: Multi-queue concurrent processing', () => {
    it('should isolate rate limits, metrics, and errors per queue', () => {
      const fastConfig = { max: 100, duration: 1000 }
      const slowConfig = { max: 5, duration: 1000 }

      // fast 佇列正常處理
      for (let i = 0; i < 20; i++) {
        simulateMessageProcessing('fast', {
          rateLimiter,
          rateConfig: fastConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 2,
        })
      }

      // slow 佇列有些被限制
      for (let i = 0; i < 10; i++) {
        simulateMessageProcessing('slow', {
          rateLimiter,
          rateConfig: slowConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 50,
        })
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(25) // 20 fast + 5 slow
      expect(snapshot.rateLimits.perQueue.fast?.allowed).toBe(20)
      expect(snapshot.rateLimits.perQueue.fast?.denied).toBe(0)
      expect(snapshot.rateLimits.perQueue.slow?.allowed).toBe(5)
      expect(snapshot.rateLimits.perQueue.slow?.denied).toBe(5)

      // 各佇列的速率限制狀態互相獨立
      const fastStats = rateLimiter.getStats('fast')
      const slowStats = rateLimiter.getStats('slow')
      expect(fastStats.allowed).toBe(20)
      expect(slowStats.allowed).toBe(5)
      expect(slowStats.denied).toBe(5)
    })

    it('should handle mixed success and failure across queues', () => {
      const rateConfig = { max: 1000, duration: 1000 }

      // orders: 全部成功
      for (let i = 0; i < 10; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 5,
        })
      }

      // payments: 全部失敗
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('payments', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          shouldFail: true,
        })
      }

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(10) // orders only
      expect(snapshot.totalFailed).toBe(5) // payments only
      expect(snapshot.errors.callback).toBe(5)
    })
  })

  // =========================================================================
  // Scenario 10: 完整生命週期（啟動 → 處理 → 錯誤 → 恢復 → 關閉）
  // =========================================================================
  describe('Scenario 10: Full lifecycle', () => {
    it('should handle complete lifecycle from start to shutdown', async () => {
      // 1. 啟動
      await heartbeat.start('consumer-1', ['orders'])
      expect(heartbeat.getStatus().isAlive).toBe(true)

      const rateConfig = { max: 100, duration: 1000 }

      // 2. 正常處理
      for (let i = 0; i < 10; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 5,
        })
      }
      expect(metrics.getSnapshot().totalProcessed).toBe(10)

      // 3. 遇到錯誤 → 電路打開
      for (let i = 0; i < 3; i++) {
        metrics.recordError('connection')
        recovery.recordFailure(new Error('connection lost'))
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 4. 等待恢復
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(recovery.getState().circuitState).toBe('HALF_OPEN')

      // 5. 探測成功 → 恢復
      recovery.recordSuccess()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 6. 繼續處理
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 8,
        })
      }

      // 7. 驗證最終狀態
      const finalSnapshot = metrics.getSnapshot()
      expect(finalSnapshot.totalProcessed).toBe(15)
      expect(finalSnapshot.totalFailed).toBe(3)
      expect(finalSnapshot.errors.connection).toBe(3)
      expect(recovery.getState().totalRecoveries).toBe(1)

      // 8. 關閉
      await heartbeat.stop()
      recovery.destroy()

      expect(heartbeat.getStatus().isAlive).toBe(false)
    })
  })

  // =========================================================================
  // Scenario 11: 指標快照不可變性
  // =========================================================================
  describe('Scenario 11: Metrics snapshot immutability', () => {
    it('should not affect internal state when snapshot is modified', () => {
      metrics.recordMessage('orders', 10)
      metrics.recordError('callback')

      const snapshot1 = metrics.getSnapshot()
      // 嘗試修改快照
      snapshot1.totalProcessed = 999
      snapshot1.errors.callback = 999

      // 內部狀態不受影響
      const snapshot2 = metrics.getSnapshot()
      expect(snapshot2.totalProcessed).toBe(1)
      expect(snapshot2.errors.callback).toBe(1)
    })

    it('should produce independent snapshots over time', () => {
      metrics.recordMessage('orders', 10)
      const snap1 = metrics.getSnapshot()

      metrics.recordMessage('orders', 20)
      metrics.recordError('timeout')
      const snap2 = metrics.getSnapshot()

      // snap1 不應被 snap2 影響
      expect(snap1.totalProcessed).toBe(1)
      expect(snap1.totalFailed).toBe(0)

      expect(snap2.totalProcessed).toBe(2)
      expect(snap2.totalFailed).toBe(1)
    })
  })

  // =========================================================================
  // Scenario 12: 元件重置後的隔離性
  // =========================================================================
  describe('Scenario 12: Component reset isolation', () => {
    it('should reset metrics without affecting other components', () => {
      const rateConfig = { max: 100, duration: 1000 }

      simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })

      recovery.recordFailure(new Error('fail'))

      // 重置 metrics
      metrics.reset()

      // metrics 已清除
      expect(metrics.getSnapshot().totalProcessed).toBe(0)

      // 其他元件不受影響
      expect(recovery.getState().consecutiveFailures).toBe(1)
      expect(rateLimiter.getStats('orders').allowed).toBe(1)
    })

    it('should reset rate limiter without affecting metrics', () => {
      const rateConfig = { max: 5, duration: 1000 }

      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
        })
      }

      // 重置 rate limiter
      rateLimiter.reset()

      // rate limiter 已清除
      expect(rateLimiter.getStats('orders').allowed).toBe(0)

      // metrics 不受影響
      expect(metrics.getSnapshot().totalProcessed).toBe(5)

      // 可以再次允許訊息
      const result = simulateMessageProcessing('orders', {
        rateLimiter,
        rateConfig,
        metrics,
        heartbeat,
      })
      expect(result.allowed).toBe(true)
      expect(metrics.getSnapshot().totalProcessed).toBe(6)
    })

    it('should reset recovery without affecting heartbeat', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      recovery.reset()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 心跳不受影響
      heartbeat.beat()
      const status = heartbeat.getStatus()
      expect(status.isAlive).toBe(true)
      expect(status.missedCount).toBe(0)
    })
  })

  // =========================================================================
  // Scenario 13: 錯誤類型分類
  // =========================================================================
  describe('Scenario 13: Error type classification', () => {
    it('should classify and track different error types independently', () => {
      metrics.recordError('serialization')
      metrics.recordError('serialization')
      metrics.recordError('callback')
      metrics.recordError('callback')
      metrics.recordError('callback')
      metrics.recordError('connection')
      metrics.recordError('timeout')
      metrics.recordError('timeout')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.serialization).toBe(2)
      expect(snapshot.errors.callback).toBe(3)
      expect(snapshot.errors.connection).toBe(1)
      expect(snapshot.errors.timeout).toBe(2)
      expect(snapshot.errors.total).toBe(8)
      expect(snapshot.totalFailed).toBe(8)
    })
  })

  // =========================================================================
  // Scenario 14: 退避延遲與恢復時機
  // =========================================================================
  describe('Scenario 14: Backoff delay calculation with recovery', () => {
    it('should calculate increasing backoff delays', () => {
      const delays: number[] = []

      for (let i = 0; i < 5; i++) {
        recovery.recordFailure(new Error('fail'))
        delays.push(recovery.getBackoffDelay())
      }

      // 指數退避: 10, 20, 40, 80, 160 (無 jitter)
      // 但 maxBackoff = 200, maxRetries = 5
      expect(delays[0]).toBe(10) // 10 * 2^0
      expect(delays[1]).toBe(20) // 10 * 2^1
      expect(delays[2]).toBe(40) // 10 * 2^2
      expect(delays[3]).toBe(80) // 10 * 2^3
      expect(delays[4]).toBe(160) // 10 * 2^4
    })

    it('should cap backoff at maxBackoffMs', () => {
      for (let i = 0; i < 10; i++) {
        recovery.recordFailure(new Error('fail'))
      }

      const delay = recovery.getBackoffDelay()
      expect(delay).toBeLessThanOrEqual(200)
    })
  })

  // =========================================================================
  // Scenario 15: 並行安全性
  // =========================================================================
  describe('Scenario 15: Concurrency safety', () => {
    it('should handle parallel metric recordings without data loss', async () => {
      const promises: Promise<void>[] = []

      for (let i = 0; i < 500; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            metrics.recordMessage(`q${i % 5}`, i % 100)
            resolve()
          })
        )
      }

      await Promise.all(promises)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(500)
    })

    it('should handle parallel rate limit checks consistently', async () => {
      const rateConfig = { max: 10, duration: 1000 }
      let allowed = 0
      let denied = 0

      const promises: Promise<void>[] = []
      for (let i = 0; i < 20; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            if (rateLimiter.check('orders', rateConfig)) {
              allowed++
            } else {
              denied++
            }
            resolve()
          })
        )
      }

      await Promise.all(promises)
      expect(allowed).toBe(10)
      expect(denied).toBe(10)
    })
  })

  // =========================================================================
  // Scenario 16: RebalanceHandler 整合
  // =========================================================================
  describe('Scenario 16: RebalanceHandler integration', () => {
    let rebalance: RebalanceHandler

    beforeEach(() => {
      rebalance = new RebalanceHandler({
        revocationTimeoutMs: 5000,
        commitOnRevoke: true,
        clearBufferOnRevoke: true,
      })
    })

    afterEach(() => {
      rebalance.destroy()
    })

    it('should coordinate rebalance with offset commit and buffer clear', async () => {
      const committedOffsets: boolean[] = []
      const clearedPartitions: PartitionAssignment[][] = []
      const clearedTracking: PartitionAssignment[][] = []

      rebalance.registerCallbacks({
        commitOffsets: async () => {
          committedOffsets.push(true)
        },
        clearPartitionBuffers: (p) => clearedPartitions.push(p),
        clearPartitionTracking: (p) => clearedTracking.push(p),
      })

      const partitions: PartitionAssignment[] = [
        { topic: 'orders', partition: 0 },
        { topic: 'orders', partition: 1 },
      ]

      await rebalance.handlePartitionsRevoked(partitions)

      expect(committedOffsets).toHaveLength(1)
      expect(clearedPartitions).toHaveLength(1)
      expect(clearedPartitions[0]).toEqual(partitions)
      expect(clearedTracking).toHaveLength(1)
    })

    it('should track rebalance events and state transitions', async () => {
      const events: RebalanceEvent[] = []
      rebalance.onRebalance((event) => events.push(event))

      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      const revoked: PartitionAssignment[] = [{ topic: 'orders', partition: 0 }]
      const assigned: PartitionAssignment[] = [
        { topic: 'orders', partition: 2 },
        { topic: 'orders', partition: 3 },
      ]

      await rebalance.handleRebalance(revoked, assigned)

      // 預期事件順序: revoking → assigning → stable
      const states = events.map((e) => e.state)
      expect(states).toContain('revoking')
      expect(states).toContain('assigning')
      expect(states).toContain('stable')

      const status = rebalance.getStatus()
      expect(status.state).toBe('stable')
      expect(status.totalRebalances).toBe(1)
      expect(status.assignedPartitions).toEqual(assigned)
      expect(status.isRebalancing).toBe(false)
    })

    it('should maintain heartbeat during rebalance', async () => {
      await heartbeat.start('consumer-1', ['orders'])

      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      // 開始重新平衡
      await rebalance.handleRebalance(
        [{ topic: 'orders', partition: 0 }],
        [{ topic: 'orders', partition: 1 }]
      )

      // 重新平衡期間持續 beat
      heartbeat.beat()
      const status = heartbeat.getStatus()
      expect(status.isAlive).toBe(true)
      expect(status.missedCount).toBe(0)
    })

    it('should track metrics during rebalance', async () => {
      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      // 重新平衡前處理一些訊息
      const rateConfig = { max: 100, duration: 1000 }
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
        })
      }

      // 執行重新平衡
      await rebalance.handleRebalance(
        [{ topic: 'orders', partition: 0 }],
        [{ topic: 'orders', partition: 1 }]
      )

      // 指標不受重新平衡影響
      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(5)
      expect(snapshot.totalFailed).toBe(0)
    })

    it('should handle rebalance during circuit open state', async () => {
      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      // 觸發電路打開
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(new Error('fail'))
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 重新平衡仍可進行（與電路狀態獨立）
      await rebalance.handleRebalance(
        [{ topic: 'orders', partition: 0 }],
        [{ topic: 'orders', partition: 1 }]
      )

      expect(rebalance.getStatus().state).toBe('stable')
      // 電路仍然打開
      expect(recovery.getState().circuitState).toBe('OPEN')
    })

    it('should update assigned partitions after revocation and assignment', async () => {
      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      // 初始分配
      await rebalance.handlePartitionsAssigned([
        { topic: 'orders', partition: 0 },
        { topic: 'orders', partition: 1 },
        { topic: 'orders', partition: 2 },
      ])

      expect(rebalance.getAssignedPartitions()).toHaveLength(3)

      // 撤銷 partition 0，分配 partition 3
      await rebalance.handleRebalance(
        [{ topic: 'orders', partition: 0 }],
        [{ topic: 'orders', partition: 3 }]
      )

      const assigned = rebalance.getAssignedPartitions()
      expect(assigned).toHaveLength(3) // 1,2,3
      expect(assigned.some((p) => p.partition === 0)).toBe(false)
      expect(assigned.some((p) => p.partition === 3)).toBe(true)
    })
  })

  // =========================================================================
  // Scenario 17: RebalanceHandler + ErrorRecovery + Metrics 端對端
  // =========================================================================
  describe('Scenario 17: Full component orchestration with rebalance', () => {
    it('should handle: process → fail → circuit open → rebalance → recover → resume', async () => {
      const rebalance = new RebalanceHandler({
        commitOnRevoke: true,
        clearBufferOnRevoke: true,
      })
      const clearedBuffers: PartitionAssignment[][] = []

      rebalance.registerCallbacks({
        commitOffsets: async () => {},
        clearPartitionBuffers: (p) => clearedBuffers.push(p),
        clearPartitionTracking: () => {},
      })

      await heartbeat.start('consumer-1', ['orders'])
      const rateConfig = { max: 1000, duration: 1000 }

      // 1. 正常處理
      for (let i = 0; i < 5; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 5,
        })
      }
      expect(metrics.getSnapshot().totalProcessed).toBe(5)

      // 2. 連續失敗 → 電路打開
      for (let i = 0; i < 3; i++) {
        metrics.recordError('connection')
        recovery.recordFailure(new Error('connection lost'))
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 3. 期間發生重新平衡
      await rebalance.handleRebalance(
        [{ topic: 'orders', partition: 0 }],
        [{ topic: 'orders', partition: 1 }]
      )
      expect(rebalance.getStatus().state).toBe('stable')
      expect(clearedBuffers).toHaveLength(1)

      // 4. 等待電路恢復
      await new Promise((resolve) => setTimeout(resolve, 150))
      recovery.recordSuccess()
      expect(recovery.getState().circuitState).toBe('CLOSED')

      // 5. 繼續處理
      for (let i = 0; i < 3; i++) {
        simulateMessageProcessing('orders', {
          rateLimiter,
          rateConfig,
          metrics,
          heartbeat,
          callbackLatencyMs: 8,
        })
      }

      // 6. 驗證最終狀態
      const finalSnapshot = metrics.getSnapshot()
      expect(finalSnapshot.totalProcessed).toBe(8)
      expect(finalSnapshot.totalFailed).toBe(3)
      expect(recovery.getState().totalRecoveries).toBe(1)
      expect(rebalance.getStatus().totalRebalances).toBe(1)

      heartbeat.beat()
      expect(heartbeat.getStatus().isAlive).toBe(true)

      rebalance.destroy()
    })
  })
})
