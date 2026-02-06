/**
 * @gravito/core - FlowControlStrategy 測試套件
 *
 * 測試各種流控策略的行為。
 */

import { describe, expect, it } from 'bun:test'
import { BackpressureState } from '../../../src/events/BackpressureManager'
import {
  CompositeStrategy,
  createDefaultStrategies,
  type FlowControlContext,
  PriorityRebalanceStrategy,
  QueueDepthStrategy,
  RateLimitStrategy,
  StarvationProtectionStrategy,
} from '../../../src/events/FlowControlStrategy'

describe('FlowControlStrategy', () => {
  const baseContext: FlowControlContext = {
    state: BackpressureState.NORMAL,
    priority: 'normal',
    totalDepth: 50,
    depthByPriority: { high: 10, normal: 30, low: 10 },
    currentRate: 50,
    config: {
      maxQueueSize: 100,
      maxEnqueueRate: 100,
      maxSizeByPriority: { high: 100, normal: 100, low: 100 },
      thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 },
      rejectionPolicy: 'drop-with-callback',
      lowPriorityDelayMs: 100,
      enableStarvationProtection: true,
      starvationTimeoutMs: 5000,
      rateLimitWindowMs: 1000,
    },
  }

  describe('QueueDepthStrategy', () => {
    it('應在低於總深度限制時允許事件', () => {
      const strategy = new QueueDepthStrategy()
      const context: FlowControlContext = {
        ...baseContext,
        totalDepth: 50,
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(true)
    })

    it('應在超過總深度限制時拒絕事件', () => {
      const strategy = new QueueDepthStrategy()
      const context: FlowControlContext = {
        ...baseContext,
        totalDepth: 101,
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(false)
    })

    it('應在准確的閾值處作出決策', () => {
      const strategy = new QueueDepthStrategy()

      const context99: FlowControlContext = {
        ...baseContext,
        totalDepth: 99,
      }
      expect(strategy.evaluate(context99).allowed).toBe(true)

      const context100: FlowControlContext = {
        ...baseContext,
        totalDepth: 100,
      }
      expect(strategy.evaluate(context100).allowed).toBe(false)
    })

    it('應返回策略名稱', () => {
      const strategy = new QueueDepthStrategy()
      expect(strategy.name).toBe('queue-depth')
    })
  })

  describe('RateLimitStrategy', () => {
    it('應允許在速率限制內的事件', () => {
      const strategy = new RateLimitStrategy()
      const context: FlowControlContext = {
        ...baseContext,
        currentRate: 50,
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(true)
    })

    it('應在超過速率時拒絕低優先級事件', () => {
      const strategy = new RateLimitStrategy()
      const context: FlowControlContext = {
        ...baseContext,
        currentRate: 150, // 超過配置的 100 events/sec
        priority: 'low',
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(false)
    })

    it('應允許高優先級事件即使超過速率限制', () => {
      const strategy = new RateLimitStrategy()
      const context: FlowControlContext = {
        ...baseContext,
        currentRate: 150,
        priority: 'high',
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(true)
    })

    it('應返回策略名稱', () => {
      const strategy = new RateLimitStrategy()
      expect(strategy.name).toBe('rate-limit')
    })
  })

  describe('PriorityRebalanceStrategy', () => {
    it('應在 WARNING 狀態下限制低優先級', () => {
      const strategy = new PriorityRebalanceStrategy()

      const context: FlowControlContext = {
        ...baseContext,
        state: BackpressureState.WARNING,
        priority: 'low',
      }

      const decision = strategy.evaluate(context)
      expect(!decision.allowed || decision.delayed).toBe(true)
    })

    it('應在 CRITICAL 狀態下拒絕低優先級', () => {
      const strategy = new PriorityRebalanceStrategy()

      const context: FlowControlContext = {
        ...baseContext,
        state: BackpressureState.CRITICAL,
        priority: 'low',
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(false)
    })

    it('應允許高優先級在任何狀態', () => {
      const strategy = new PriorityRebalanceStrategy()

      const contextCritical: FlowControlContext = {
        ...baseContext,
        state: BackpressureState.CRITICAL,
        priority: 'high',
      }

      const decision = strategy.evaluate(contextCritical)
      expect(decision.allowed).toBe(true)
    })

    it('應返回策略名稱', () => {
      const strategy = new PriorityRebalanceStrategy()
      expect(strategy.name).toBe('priority-rebalance')
    })
  })

  describe('StarvationProtectionStrategy', () => {
    it('應允許未超過飢餓超時的低優先級事件', () => {
      const strategy = new StarvationProtectionStrategy()

      const context: FlowControlContext = {
        ...baseContext,
        priority: 'low',
      }

      const decision = strategy.evaluate(context)
      expect(decision.allowed).toBe(true)
    })

    it('應返回策略名稱', () => {
      const strategy = new StarvationProtectionStrategy()
      expect(strategy.name).toBe('starvation-protection')
    })
  })

  describe('CompositeStrategy', () => {
    it('應組合多個策略並使用最嚴格的決策', () => {
      const strategy1 = new QueueDepthStrategy()
      const strategy2 = new RateLimitStrategy()

      const composite = new CompositeStrategy([strategy1, strategy2])

      // 超過隊列深度限制
      const context: FlowControlContext = {
        ...baseContext,
        totalDepth: 150,
      }

      const decision = composite.evaluate(context)
      expect(decision.allowed).toBe(false)
    })

    it('應在所有策略都允許時允許事件', () => {
      const strategy1 = new QueueDepthStrategy()
      const strategy2 = new RateLimitStrategy()

      const composite = new CompositeStrategy([strategy1, strategy2])

      const context: FlowControlContext = {
        ...baseContext,
        totalDepth: 50,
        currentRate: 50,
      }

      const decision = composite.evaluate(context)
      expect(decision.allowed).toBe(true)
    })

    it('應返回策略名稱', () => {
      const composite = new CompositeStrategy([new QueueDepthStrategy()])
      expect(composite.name).toBe('composite')
    })
  })

  describe('createDefaultStrategies()', () => {
    it('應返回推薦的策略組合', () => {
      const strategies = createDefaultStrategies({
        maxQueueSize: 1000,
        maxEnqueueRate: 1000,
        maxSizeByPriority: { high: 500, normal: 500, low: 500 },
        rateLimitWindowMs: 1000,
        thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 },
        rejectionPolicy: 'drop-with-callback',
        lowPriorityDelayMs: 100,
        enableStarvationProtection: true,
        starvationTimeoutMs: 5000,
      })

      expect(strategies.length).toBeGreaterThan(0)
    })

    it('應包含 QueueDepth 策略', () => {
      const strategies = createDefaultStrategies({
        maxQueueSize: 1000,
        maxEnqueueRate: 1000,
        maxSizeByPriority: { high: 500, normal: 500, low: 500 },
        rateLimitWindowMs: 1000,
        thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 },
        rejectionPolicy: 'drop-with-callback',
        lowPriorityDelayMs: 100,
        enableStarvationProtection: true,
        starvationTimeoutMs: 5000,
      })

      const hasQueueDepth = strategies.some((s) => s.name === 'queue-depth')
      expect(hasQueueDepth).toBe(true)
    })

    it('應包含 RateLimit 策略', () => {
      const strategies = createDefaultStrategies({
        maxQueueSize: 1000,
        maxEnqueueRate: 1000,
        maxSizeByPriority: { high: 500, normal: 500, low: 500 },
        rateLimitWindowMs: 1000,
        thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 },
        rejectionPolicy: 'drop-with-callback',
        lowPriorityDelayMs: 100,
        enableStarvationProtection: true,
        starvationTimeoutMs: 5000,
      })

      const hasRateLimit = strategies.some((s) => s.name === 'rate-limit')
      expect(hasRateLimit).toBe(true)
    })
  })

  describe('性能指標', () => {
    it('策略評估應快速完成', () => {
      const strategy = new QueueDepthStrategy()

      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        strategy.evaluate(baseContext)
      }
      const elapsed = performance.now() - start

      // 平均時間應 < 0.1ms
      expect(elapsed / 1000).toBeLessThan(0.1)
    })
  })
})
