import { beforeEach, describe, expect, it } from 'bun:test'
import {
  type BackpressureConfig,
  BackpressureManager,
  BackpressureState,
} from '../../src/backpressure/BackpressureManager'

// ── Helper ──────────────────────────────────────────────────────

/** 建立分優先級隊列深度物件 */
const makeDepth = (critical = 0, high = 0, normal = 0, low = 0) => ({ critical, high, normal, low })

/** 標準測試配置：maxQueueSize=100，預設閾值 */
const baseConfig = (overrides: BackpressureConfig = {}): BackpressureConfig => ({
  maxQueueSize: 100,
  ...overrides,
})

// ── Tests ───────────────────────────────────────────────────────

describe('BackpressureManager', () => {
  let bpm: BackpressureManager

  // ──────────────────────────────────────────
  // 1. enabled:false 旁路
  // ──────────────────────────────────────────
  describe('enabled:false bypass', () => {
    beforeEach(() => {
      bpm = new BackpressureManager({ enabled: false, maxQueueSize: 100 })
    })

    it('should always allow events when disabled', () => {
      const decision = bpm.evaluate('evt', 'low', 100, makeDepth(0, 0, 0, 100))
      expect(decision.allowed).toBe(true)
      expect(decision.reason).toBeUndefined()
    })

    it('should remain in NORMAL state regardless of queue depth', () => {
      bpm.evaluate('evt', 'low', 200, makeDepth(0, 0, 0, 200))
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
    })
  })

  // ──────────────────────────────────────────
  // 2. NORMAL 決策矩陣
  // ──────────────────────────────────────────
  describe('NORMAL decision matrix', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
    })

    it('should allow critical priority in NORMAL', () => {
      const d = bpm.evaluate('evt', 'critical', 10, makeDepth(10, 0, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow high priority in NORMAL', () => {
      const d = bpm.evaluate('evt', 'high', 10, makeDepth(0, 10, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow normal priority in NORMAL', () => {
      const d = bpm.evaluate('evt', 'normal', 10, makeDepth(0, 0, 10, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow low priority in NORMAL', () => {
      const d = bpm.evaluate('evt', 'low', 10, makeDepth(0, 0, 0, 10))
      expect(d.allowed).toBe(true)
    })
  })

  // ──────────────────────────────────────────
  // 3. WARNING 決策矩陣
  // ──────────────────────────────────────────
  describe('WARNING decision matrix', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
      // 推進到 WARNING：queueSize = 60 => 60% 閾值
      bpm.evaluate('setup', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)
    })

    it('should allow critical priority in WARNING', () => {
      const d = bpm.evaluate('evt', 'critical', 60, makeDepth(60, 0, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow high priority in WARNING', () => {
      const d = bpm.evaluate('evt', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow normal priority in WARNING', () => {
      const d = bpm.evaluate('evt', 'normal', 60, makeDepth(0, 0, 60, 0))
      expect(d.allowed).toBe(true)
    })

    it('should delay low priority in WARNING', () => {
      const d = bpm.evaluate('evt', 'low', 60, makeDepth(0, 0, 0, 60))
      expect(d.allowed).toBe(true)
      expect(d.delayed).toBe(true)
      expect(d.delayMs).toBe(100)
    })

    it('should reject low priority when rate exceeds limit in WARNING', () => {
      const rateLimited = new BackpressureManager(baseConfig({ maxEnqueueRate: 1 }))
      // 第一次 evaluate 推進到 WARNING
      rateLimited.evaluate('setup', 'high', 60, makeDepth(0, 60, 0, 0))
      // 多次呼叫讓速率超過限制
      for (let i = 0; i < 20; i++) {
        rateLimited.evaluate('flood', 'high', 60, makeDepth(0, 60, 0, 0))
      }
      const d = rateLimited.evaluate('evt', 'low', 60, makeDepth(0, 0, 0, 60))
      expect(d.allowed).toBe(false)
      expect(d.reason).toContain('Rate limit')
    })
  })

  // ──────────────────────────────────────────
  // 4. CRITICAL 決策矩陣
  // ──────────────────────────────────────────
  describe('CRITICAL decision matrix', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
      // 推進到 CRITICAL：queueSize = 85 => 85% 閾值
      bpm.evaluate('setup', 'high', 85, makeDepth(0, 85, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)
    })

    it('should allow critical priority in CRITICAL', () => {
      const d = bpm.evaluate('evt', 'critical', 85, makeDepth(85, 0, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should allow high priority in CRITICAL', () => {
      const d = bpm.evaluate('evt', 'high', 85, makeDepth(0, 85, 0, 0))
      expect(d.allowed).toBe(true)
    })

    it('should delay normal priority in CRITICAL', () => {
      const d = bpm.evaluate('evt', 'normal', 85, makeDepth(0, 0, 85, 0))
      expect(d.allowed).toBe(true)
      expect(d.delayed).toBe(true)
      expect(d.delayMs).toBe(100)
    })

    it('should reject low priority in CRITICAL', () => {
      const d = bpm.evaluate('evt', 'low', 85, makeDepth(0, 0, 0, 85))
      expect(d.allowed).toBe(false)
      expect(d.reason).toContain('CRITICAL')
    })

    it('should increment rejectedCount on rejection in CRITICAL', () => {
      bpm.evaluate('evt', 'low', 85, makeDepth(0, 0, 0, 85))
      expect(bpm.getMetrics().rejectedCount).toBeGreaterThanOrEqual(1)
    })
  })

  // ──────────────────────────────────────────
  // 5. OVERFLOW 決策矩陣
  // ──────────────────────────────────────────
  describe('OVERFLOW decision matrix', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
      // 推進到 OVERFLOW：queueSize = 100 => 100%
      bpm.evaluate('setup', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)
    })

    it('should reject critical priority in OVERFLOW', () => {
      const d = bpm.evaluate('evt', 'critical', 100, makeDepth(100, 0, 0, 0))
      expect(d.allowed).toBe(false)
      expect(d.isOverflow).toBe(true)
    })

    it('should reject high priority in OVERFLOW', () => {
      const d = bpm.evaluate('evt', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(d.allowed).toBe(false)
      expect(d.isOverflow).toBe(true)
    })

    it('should reject normal priority in OVERFLOW', () => {
      const d = bpm.evaluate('evt', 'normal', 100, makeDepth(0, 0, 100, 0))
      expect(d.allowed).toBe(false)
      expect(d.isOverflow).toBe(true)
    })

    it('should reject low priority in OVERFLOW with retryStrategy', () => {
      const d = bpm.evaluate('evt', 'low', 100, makeDepth(0, 0, 0, 100))
      expect(d.allowed).toBe(false)
      expect(d.isOverflow).toBe(true)
      expect(d.retryStrategy).toBe('dlq-only')
    })

    it('should include delayed retryStrategy when configured', () => {
      const mgr = new BackpressureManager(
        baseConfig({
          overflowRetryStrategy: 'delayed',
          overflowRetryDelayMs: 3000,
        })
      )
      mgr.evaluate('setup', 'high', 100, makeDepth(0, 100, 0, 0))
      const d = mgr.evaluate('evt', 'normal', 100, makeDepth(0, 0, 100, 0))
      expect(d.retryStrategy).toBe('delayed')
      expect(d.delayMs).toBe(3000)
    })
  })

  // ──────────────────────────────────────────
  // 6. 狀態升級路徑
  // ──────────────────────────────────────────
  describe('state escalation path', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
    })

    it('should start in NORMAL state', () => {
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
    })

    it('should escalate NORMAL -> WARNING at 60%', () => {
      bpm.evaluate('evt', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)
    })

    it('should escalate WARNING -> CRITICAL at 85%', () => {
      bpm.evaluate('step1', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      bpm.evaluate('step2', 'high', 85, makeDepth(0, 85, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)
    })

    it('should escalate CRITICAL -> OVERFLOW at 100%', () => {
      bpm.evaluate('step1', 'high', 60, makeDepth(0, 60, 0, 0))
      bpm.evaluate('step2', 'high', 85, makeDepth(0, 85, 0, 0))
      bpm.evaluate('step3', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)
    })

    it('should jump directly NORMAL -> OVERFLOW when queue is instantly full', () => {
      bpm.evaluate('evt', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)
    })
  })

  // ──────────────────────────────────────────
  // 7. 狀態恢復遲滯
  // ──────────────────────────────────────────
  describe('state recovery hysteresis', () => {
    beforeEach(() => {
      bpm = new BackpressureManager(baseConfig())
    })

    it('WARNING should NOT downgrade to NORMAL at 50% (above hysteresis 48%)', () => {
      // 升級到 WARNING
      bpm.evaluate('up', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      // 降至 50% => 仍高於 0.6 * 0.8 = 0.48 => 應保持 WARNING
      bpm.evaluate('check', 'high', 50, makeDepth(0, 50, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)
    })

    it('WARNING should downgrade to NORMAL below 48% (hysteresis threshold)', () => {
      bpm.evaluate('up', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      // 降至 47 => 0.47 < 0.6 * 0.8 = 0.48 => 應降為 NORMAL
      bpm.evaluate('check', 'high', 47, makeDepth(0, 47, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
    })

    it('CRITICAL should NOT downgrade to WARNING at 70% (above hysteresis 68%)', () => {
      bpm.evaluate('up1', 'high', 85, makeDepth(0, 85, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)

      // 70% > 0.85 * 0.8 = 0.68 => 保持 CRITICAL
      bpm.evaluate('check', 'high', 70, makeDepth(0, 70, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)
    })

    it('CRITICAL should downgrade to WARNING below 68% (hysteresis threshold)', () => {
      bpm.evaluate('up1', 'high', 85, makeDepth(0, 85, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)

      // 67% < 0.85 * 0.8 = 0.68 => depthRatio 0.67 >= warning 0.6
      // 在 updateState 中: depthRatio(0.67) >= warning(0.6)
      // 所以進入第二個 else if 分支: depthRatio < critical * hysteresisRatio
      // 0.67 < 0.85 * 0.8 = 0.68 => true, state === CRITICAL => true
      // 所以 newState = WARNING
      bpm.evaluate('check', 'high', 67, makeDepth(0, 67, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)
    })

    it('OVERFLOW should downgrade to CRITICAL below 80% (no extra hysteresis)', () => {
      // 升級到 OVERFLOW
      bpm.evaluate('up', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)

      // 降至 79% < overflow(1.0) * 0.8 = 0.80 => 應降為 CRITICAL
      // depthRatio 0.79 >= warning(0.6), < critical(0.85)
      // 分支: depthRatio(0.79) < overflow(1.0) * 0.8(0.80) => true, state === OVERFLOW => true
      // newState = CRITICAL
      bpm.evaluate('check', 'high', 79, makeDepth(0, 79, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.CRITICAL)
    })
  })

  // ──────────────────────────────────────────
  // 8. onStateChange callback
  // ──────────────────────────────────────────
  describe('onStateChange callback', () => {
    it('should fire callback on state upgrade', () => {
      const transitions: Array<{ from: BackpressureState; to: BackpressureState }> = []
      bpm = new BackpressureManager(
        baseConfig({
          onStateChange: (from, to) => {
            transitions.push({ from, to })
          },
        })
      )

      bpm.evaluate('evt', 'high', 60, makeDepth(0, 60, 0, 0))

      expect(transitions).toHaveLength(1)
      expect(transitions[0].from).toBe(BackpressureState.NORMAL)
      expect(transitions[0].to).toBe(BackpressureState.WARNING)
    })

    it('should fire callback on state downgrade', () => {
      const transitions: Array<{ from: BackpressureState; to: BackpressureState }> = []
      bpm = new BackpressureManager(
        baseConfig({
          onStateChange: (from, to) => {
            transitions.push({ from, to })
          },
        })
      )

      // 升級到 WARNING
      bpm.evaluate('up', 'high', 60, makeDepth(0, 60, 0, 0))
      // 降回 NORMAL（47% < 48% 遲滯閾值）
      bpm.evaluate('down', 'high', 47, makeDepth(0, 47, 0, 0))

      expect(transitions).toHaveLength(2)
      expect(transitions[1].from).toBe(BackpressureState.WARNING)
      expect(transitions[1].to).toBe(BackpressureState.NORMAL)
    })

    it('should track stateTransitions count in metrics', () => {
      bpm = new BackpressureManager(baseConfig())

      // NORMAL -> WARNING -> CRITICAL -> OVERFLOW = 3 transitions
      bpm.evaluate('s1', 'high', 60, makeDepth(0, 60, 0, 0))
      bpm.evaluate('s2', 'high', 85, makeDepth(0, 85, 0, 0))
      bpm.evaluate('s3', 'high', 100, makeDepth(0, 100, 0, 0))

      expect(bpm.getMetrics().stateTransitions).toBe(3)
    })
  })

  // ──────────────────────────────────────────
  // 9. makeDeadLetterDecision()
  // ──────────────────────────────────────────
  describe('makeDeadLetterDecision()', () => {
    it('should return shouldRoute=false when not in OVERFLOW', () => {
      bpm = new BackpressureManager(baseConfig())
      bpm.evaluate('evt', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      const decision = bpm.makeDeadLetterDecision('evt', 'low')
      expect(decision.shouldRoute).toBe(false)
    })

    it('should return shouldRoute=false when dlqOnOverflow is disabled', () => {
      bpm = new BackpressureManager(baseConfig({ dlqOnOverflow: false }))
      bpm.evaluate('evt', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)

      const decision = bpm.makeDeadLetterDecision('evt', 'low')
      expect(decision.shouldRoute).toBe(false)
      expect(decision.reason).toContain('DLQ disabled')
    })

    it('should route low priority to DLQ in OVERFLOW with dlqOnOverflow enabled', () => {
      bpm = new BackpressureManager(baseConfig({ dlqOnOverflow: true }))
      bpm.evaluate('evt', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)

      const decision = bpm.makeDeadLetterDecision('evt', 'low')
      expect(decision.shouldRoute).toBe(true)
      expect(decision.retryStrategy).toBe('dlq-only')
      expect(bpm.getMetrics().dlqRouteCount).toBe(1)
    })

    it('should suggest delayed retry for high priority in OVERFLOW', () => {
      bpm = new BackpressureManager(baseConfig({ dlqOnOverflow: true }))
      bpm.evaluate('evt', 'high', 100, makeDepth(0, 100, 0, 0))

      const decision = bpm.makeDeadLetterDecision('evt', 'high')
      expect(decision.shouldRoute).toBe(false)
      expect(decision.retryStrategy).toBe('delayed')
    })
  })

  // ──────────────────────────────────────────
  // 10. reset()
  // ──────────────────────────────────────────
  describe('reset()', () => {
    it('should reset state to NORMAL and clear all metrics', () => {
      bpm = new BackpressureManager(baseConfig())

      // 推進到 OVERFLOW 並產生一些 metrics
      bpm.evaluate('up', 'high', 100, makeDepth(0, 100, 0, 0))
      bpm.evaluate('rejected', 'low', 100, makeDepth(0, 0, 0, 100))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)
      expect(bpm.getMetrics().rejectedCount).toBeGreaterThan(0)

      bpm.reset()

      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
      const metrics = bpm.getMetrics()
      expect(metrics.rejectedCount).toBe(0)
      expect(metrics.degradedCount).toBe(0)
      expect(metrics.stateTransitions).toBe(0)
      expect(metrics.totalDepth).toBe(0)
      expect(metrics.dlqRouteCount).toBe(0)
      expect(metrics.windowAdjustmentCount).toBe(0)
    })

    it('should allow normal operation after reset', () => {
      bpm = new BackpressureManager(baseConfig())

      // 推進到 OVERFLOW
      bpm.evaluate('up', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)

      bpm.reset()

      // 應該回到 NORMAL 且可正常評估
      const d = bpm.evaluate('evt', 'low', 10, makeDepth(0, 0, 0, 10))
      expect(d.allowed).toBe(true)
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
    })
  })

  // ──────────────────────────────────────────
  // 11. 額外邊界場景
  // ──────────────────────────────────────────
  describe('edge cases', () => {
    it('should stay NORMAL when maxQueueSize is Infinity', () => {
      bpm = new BackpressureManager({ maxQueueSize: Number.POSITIVE_INFINITY })
      bpm.evaluate('evt', 'low', 999999, makeDepth(0, 0, 0, 999999))
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)
    })

    it('should reject when per-priority queue is full', () => {
      bpm = new BackpressureManager(
        baseConfig({
          maxSizeByPriority: { low: 5 },
        })
      )
      // depthByPriority.low = 5 >= maxSizeByPriority.low = 5 => 拒絕
      const d = bpm.evaluate('evt', 'low', 10, makeDepth(0, 0, 0, 5))
      expect(d.allowed).toBe(false)
      expect(d.reason).toContain('Priority queue full')
    })

    it('should invoke onRejected callback when event is rejected', () => {
      const rejected: Array<{ name: string; pri: string; reason: string }> = []
      bpm = new BackpressureManager(
        baseConfig({
          onRejected: (name, pri, reason) => {
            rejected.push({ name, pri, reason })
          },
        })
      )
      // 推進到 CRITICAL
      bpm.evaluate('setup', 'high', 85, makeDepth(0, 85, 0, 0))
      // 低優先級應被拒絕
      bpm.evaluate('test-evt', 'low', 85, makeDepth(0, 0, 0, 85))

      expect(rejected).toHaveLength(1)
      expect(rejected[0].name).toBe('test-evt')
      expect(rejected[0].pri).toBe('low')
    })

    it('should handle updateQueueDepth and recalculate state', () => {
      bpm = new BackpressureManager(baseConfig())
      expect(bpm.getState()).toBe(BackpressureState.NORMAL)

      bpm.updateQueueDepth({ critical: 0, high: 60, normal: 0, low: 0, total: 60 })
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      const depth = bpm.getQueueDepthByPriority()
      expect(depth.high).toBe(60)
      expect(depth.total).toBe(60)
    })

    it('should record window adjustment history via notifyWindowAdjustment', () => {
      bpm = new BackpressureManager(baseConfig())
      bpm.notifyWindowAdjustment(1000, 500)
      expect(bpm.getMetrics().windowAdjustmentCount).toBe(1)
    })

    it('should return correct getTotalQueueDepth after updateQueueDepth', () => {
      bpm = new BackpressureManager(baseConfig())
      bpm.updateQueueDepth({ critical: 5, high: 10, normal: 15, low: 20, total: 50 })
      expect(bpm.getTotalQueueDepth()).toBe(50)
    })

    it('OVERFLOW should stay at 80% due to hysteresis in range [0.60, 0.85)', () => {
      bpm = new BackpressureManager(baseConfig())
      // 直接到 OVERFLOW
      bpm.evaluate('up', 'high', 100, makeDepth(0, 100, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)

      // 降至 80% => depthRatio 0.80 NOT < overflow(1.0) * 0.8(0.80) => 保持 OVERFLOW
      bpm.evaluate('check', 'high', 80, makeDepth(0, 80, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.OVERFLOW)
    })

    it('should not transition from WARNING when depth stays in warning range', () => {
      bpm = new BackpressureManager(baseConfig())
      bpm.evaluate('up', 'high', 60, makeDepth(0, 60, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)

      // 65% => 仍在 warning 範圍，不升級也不降級
      bpm.evaluate('check', 'high', 65, makeDepth(0, 65, 0, 0))
      expect(bpm.getState()).toBe(BackpressureState.WARNING)
    })
  })
})
