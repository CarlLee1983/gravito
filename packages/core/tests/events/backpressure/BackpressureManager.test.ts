/**
 * @gravito/core - BackpressureManager 測試套件
 *
 * 測試背壓管理器的狀態轉換、決策邏輯、速率限制、優先級管理等。
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureManager, BackpressureState } from '../../../src/events/BackpressureManager'

describe('BackpressureManager', () => {
  let manager: BackpressureManager

  beforeEach(() => {
    manager = new BackpressureManager()
  })

  describe('初始化與配置', () => {
    it('應使用默認配置初始化', () => {
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
      const metrics = manager.getMetrics()
      expect(metrics.rejectedCount).toBe(0)
      expect(metrics.degradedCount).toBe(0)
    })

    it('應接受自定義配置', () => {
      const customManager = new BackpressureManager({
        enabled: true,
        maxQueueSize: 100,
        thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
      })
      expect(customManager.getState()).toBe(BackpressureState.NORMAL)
    })

    it('應在禁用時允許所有事件', () => {
      const disabledManager = new BackpressureManager({ enabled: false })
      const decision = disabledManager.evaluate('test', 'low', 1000, {
        high: 900,
        normal: 0,
        low: 100,
      })
      expect(decision.allowed).toBe(true)
      expect(decision.reason).toBeUndefined()
    })
  })

  describe('狀態轉換', () => {
    it('NORMAL → WARNING 當深度 >= 60%', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      // 在 59% 時應保持 NORMAL
      manager.evaluate('test', 'normal', 59, { high: 0, normal: 59, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.NORMAL)

      // 在 60% 時應轉換為 WARNING
      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)
    })

    it('WARNING → CRITICAL 當深度 >= 85%', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      // 先達到 WARNING
      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 轉換到 CRITICAL
      manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)
    })

    it('CRITICAL → OVERFLOW 當深度 >= 100%', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      manager.evaluate('test', 'normal', 100, { high: 0, normal: 100, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)
    })

    it('應支持狀態變更回呼', () => {
      const transitions: [BackpressureState, BackpressureState][] = []

      manager = new BackpressureManager({
        maxQueueSize: 100,
        onStateChange: (from, to) => transitions.push([from, to]),
      })

      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })

      expect(transitions.length).toBe(2)
      expect(transitions[0]).toEqual([BackpressureState.NORMAL, BackpressureState.WARNING])
      expect(transitions[1]).toEqual([BackpressureState.WARNING, BackpressureState.CRITICAL])
    })
  })

  describe('遲滯恢復設計', () => {
    it('WARNING → NORMAL 需要降至 48% (60% * 80%)', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      // 升至 WARNING
      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 在 49% 時仍在 WARNING
      manager.evaluate('test', 'normal', 49, { high: 0, normal: 49, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 降至 47% 時恢復為 NORMAL (需要 < 48%)
      manager.evaluate('test', 'normal', 47, { high: 0, normal: 47, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
    })

    it('CRITICAL → WARNING 需要降至 68% (85% * 80%)', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 在 69% 時仍在 CRITICAL
      manager.evaluate('test', 'normal', 69, { high: 0, normal: 69, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 降至 67% 時恢復為 WARNING (需要 < 68%)
      manager.evaluate('test', 'normal', 67, { high: 0, normal: 67, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)
    })

    it('OVERFLOW → CRITICAL 需要降至 80% (100% * 80%)', () => {
      manager = new BackpressureManager({ maxQueueSize: 100 })

      manager.evaluate('test', 'normal', 100, { high: 0, normal: 100, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      // 在 81% 時仍在 OVERFLOW
      manager.evaluate('test', 'normal', 81, { high: 0, normal: 81, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      // 降至 79% 時恢復為 CRITICAL (需要 < 80%)
      manager.evaluate('test', 'normal', 79, { high: 0, normal: 79, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)
    })
  })

  describe('決策邏輯', () => {
    describe('NORMAL 狀態', () => {
      it('應允許所有優先級的事件', () => {
        const highDecision = manager.evaluate('test', 'high', 10, { high: 10, normal: 0, low: 0 })
        const normalDecision = manager.evaluate('test', 'normal', 10, {
          high: 0,
          normal: 10,
          low: 0,
        })
        const lowDecision = manager.evaluate('test', 'low', 10, { high: 0, normal: 0, low: 10 })

        expect(highDecision.allowed).toBe(true)
        expect(normalDecision.allowed).toBe(true)
        expect(lowDecision.allowed).toBe(true)
      })
    })

    describe('WARNING 狀態', () => {
      beforeEach(() => {
        manager = new BackpressureManager({ maxQueueSize: 100 })
        manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      })

      it('應允許高優先級事件', () => {
        const decision = manager.evaluate('test', 'high', 60, { high: 10, normal: 50, low: 0 })
        expect(decision.allowed).toBe(true)
      })

      it('應延遲低優先級事件', () => {
        const decision = manager.evaluate('test', 'low', 60, { high: 0, normal: 60, low: 0 })
        expect(decision.allowed).toBe(true)
        expect(decision.delayed).toBe(true)
        expect(decision.delayMs).toBeGreaterThan(0)
      })

      it('應允許但不延遲普通優先級事件', () => {
        const decision = manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
        expect(decision.allowed).toBe(true)
        // 在 WARNING 狀態下普通優先級應該被允許（不延遲）
      })
    })

    describe('CRITICAL 狀態', () => {
      beforeEach(() => {
        manager = new BackpressureManager({ maxQueueSize: 100 })
        manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
      })

      it('應允許高優先級事件', () => {
        const decision = manager.evaluate('test', 'high', 85, { high: 20, normal: 65, low: 0 })
        expect(decision.allowed).toBe(true)
      })

      it('應延遲普通優先級事件', () => {
        const decision = manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
        expect(decision.allowed).toBe(true)
        expect(decision.delayed).toBe(true)
      })

      it('應拒絕低優先級事件', () => {
        const decision = manager.evaluate('test', 'low', 85, { high: 0, normal: 85, low: 0 })
        expect(decision.allowed).toBe(false)
        expect(decision.reason).toContain('CRITICAL')
      })
    })

    describe('OVERFLOW 狀態', () => {
      beforeEach(() => {
        manager = new BackpressureManager({ maxQueueSize: 100 })
        manager.evaluate('test', 'normal', 100, { high: 0, normal: 100, low: 0 })
      })

      it('應拒絕所有事件', () => {
        const highDecision = manager.evaluate('test', 'high', 100, { high: 40, normal: 60, low: 0 })
        const normalDecision = manager.evaluate('test', 'normal', 100, {
          high: 40,
          normal: 60,
          low: 0,
        })
        const lowDecision = manager.evaluate('test', 'low', 100, { high: 40, normal: 60, low: 0 })

        expect(highDecision.allowed).toBe(false)
        expect(normalDecision.allowed).toBe(false)
        expect(lowDecision.allowed).toBe(false)
      })
    })
  })

  describe('分優先級隊列深度限制', () => {
    it('應拒絕超過優先級限制的事件', () => {
      manager = new BackpressureManager({
        maxSizeByPriority: { high: 50, normal: 100, low: 50 },
      })

      const decision = manager.evaluate('test', 'high', 100, { high: 50, normal: 50, low: 0 })
      expect(decision.allowed).toBe(false)
      expect(decision.reason).toContain('Priority queue full')
    })

    it('應允許未超過優先級限制的事件', () => {
      manager = new BackpressureManager({
        maxSizeByPriority: { high: 50, normal: 100, low: 50 },
      })

      const decision = manager.evaluate('test', 'high', 100, { high: 49, normal: 50, low: 0 })
      expect(decision.allowed).toBe(true)
    })
  })

  describe('拒絕回呼', () => {
    it('應在事件被拒絕時調用回呼', () => {
      const rejections: [string, string, string][] = []

      manager = new BackpressureManager({
        maxQueueSize: 100,
        onRejected: (eventName, priority, reason) => {
          rejections.push([eventName, priority, reason])
        },
      })

      manager.evaluate('test:event', 'normal', 100, { high: 0, normal: 100, low: 0 })

      expect(rejections.length).toBe(1)
      expect(rejections[0][0]).toBe('test:event')
      expect(rejections[0][1]).toBe('normal')
    })

    it('應在分優先級限制被觸發時調用回呼', () => {
      const rejections: [string, string, string][] = []

      manager = new BackpressureManager({
        maxSizeByPriority: { high: 10, normal: 100, low: 100 },
        onRejected: (eventName, priority, reason) => {
          rejections.push([eventName, priority, reason])
        },
      })

      manager.evaluate('test:high', 'high', 50, { high: 10, normal: 40, low: 0 })

      expect(rejections.length).toBeGreaterThan(0)
    })
  })

  describe('速率限制', () => {
    it('應在超過速率限制時拒絕低優先級事件', () => {
      manager = new BackpressureManager({
        maxEnqueueRate: 10, // 10 events/sec
        rateLimitWindowMs: 1000,
      })

      // 快速發送 11 個事件，超過 10 events/sec 限制
      for (let i = 0; i < 11; i++) {
        manager.evaluate(`test${i}`, 'low', 5, { high: 0, normal: 0, low: 5 })
      }

      const metrics = manager.getMetrics()
      expect(metrics.rejectedCount).toBeGreaterThan(0)
    })

    it('應允許高優先級事件即使超過速率限制', () => {
      manager = new BackpressureManager({
        maxEnqueueRate: 10,
        rateLimitWindowMs: 1000,
      })

      // 發送超過限制數量的高優先級事件
      let rejectedCount = 0
      for (let i = 0; i < 20; i++) {
        const decision = manager.evaluate(`test${i}`, 'high', 5, { high: 5, normal: 0, low: 0 })
        if (!decision.allowed) {
          rejectedCount++
        }
      }

      // 高優先級不應被拒絕（在非 OVERFLOW 時）
      expect(rejectedCount).toBe(0)
    })
  })

  describe('指標收集', () => {
    it('應追蹤拒絕計數', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      // 拒絕 3 個事件
      manager.evaluate('test1', 'normal', 100, { high: 0, normal: 100, low: 0 })
      manager.evaluate('test2', 'normal', 100, { high: 0, normal: 100, low: 0 })
      manager.evaluate('test3', 'normal', 100, { high: 0, normal: 100, low: 0 })

      const metrics = manager.getMetrics()
      expect(metrics.rejectedCount).toBe(3)
    })

    it('應追蹤狀態轉換次數', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      const initialMetrics = manager.getMetrics()
      expect(initialMetrics.stateTransitions).toBe(0)

      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      const afterWarning = manager.getMetrics()
      expect(afterWarning.stateTransitions).toBe(1)

      manager.evaluate('test', 'normal', 85, { high: 0, normal: 85, low: 0 })
      const afterCritical = manager.getMetrics()
      expect(afterCritical.stateTransitions).toBe(2)
    })

    it('應提供入隊速率度量', () => {
      manager = new BackpressureManager({
        rateLimitWindowMs: 1000,
      })

      // 發送 10 個事件
      for (let i = 0; i < 10; i++) {
        manager.evaluate(`test${i}`, 'normal', 5, { high: 0, normal: 5, low: 0 })
      }

      const metrics = manager.getMetrics()
      expect(metrics.enqueueRate).toBeGreaterThan(0)
    })

    it('應返回完整指標快照', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      manager.evaluate('test', 'normal', 50, { high: 10, normal: 40, low: 0 })

      const metrics = manager.getMetrics()
      expect(metrics.state).toBe(BackpressureState.NORMAL)
      expect(metrics.rejectedCount).toBe(0)
      expect(metrics.degradedCount).toBe(0)
      expect(metrics.stateTransitions).toBe(0)
      expect(metrics.enqueueRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('重置', () => {
    it('應清除所有指標和狀態', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      manager.evaluate('test', 'normal', 100, { high: 0, normal: 100, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      const metricsBeforeReset = manager.getMetrics()
      expect(metricsBeforeReset.rejectedCount).toBeGreaterThan(0)

      manager.reset()

      expect(manager.getState()).toBe(BackpressureState.NORMAL)
      const metricsAfterReset = manager.getMetrics()
      expect(metricsAfterReset.rejectedCount).toBe(0)
      expect(metricsAfterReset.stateTransitions).toBe(0)
    })
  })

  describe('自定義配置', () => {
    it('應使用自定義延遲時間', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
        lowPriorityDelayMs: 500,
      })

      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      const decision = manager.evaluate('test', 'low', 60, { high: 0, normal: 60, low: 0 })

      expect(decision.delayMs).toBe(500)
    })

    it('應支持自定義閾值', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
        thresholds: { warning: 0.3, critical: 0.6, overflow: 0.9 },
      })

      // 在 30% 時應達到 WARNING
      manager.evaluate('test', 'normal', 30, { high: 0, normal: 30, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 在 60% 時應達到 CRITICAL
      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)
    })

    it('應在無限隊列時禁用狀態管理', () => {
      manager = new BackpressureManager({
        maxQueueSize: Number.POSITIVE_INFINITY,
      })

      manager.evaluate('test', 'normal', 1000000, { high: 0, normal: 1000000, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
    })
  })

  describe('邊界情況', () => {
    it('應處理零隊列深度', () => {
      const decision = manager.evaluate('test', 'high', 0, { high: 0, normal: 0, low: 0 })
      expect(decision.allowed).toBe(true)
    })

    it('應處理非常大的隊列深度', () => {
      manager = new BackpressureManager({
        maxQueueSize: 1000000,
      })

      const decision = manager.evaluate('test', 'high', 999999, { high: 999999, normal: 0, low: 0 })
      expect(decision.allowed).toBe(true)
    })

    it('應在快速狀態變化中保持一致性', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      // 振盪在閾值附近
      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      manager.evaluate('test', 'normal', 59, { high: 0, normal: 59, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING) // 應保持 WARNING，直到降至 48%

      manager.evaluate('test', 'normal', 60, { high: 0, normal: 60, low: 0 })
      expect(manager.getState()).toBe(BackpressureState.WARNING)
    })
  })

  describe('性能指標', () => {
    it('evaluate() 應完成在 < 1ms', () => {
      manager = new BackpressureManager({
        maxQueueSize: 100,
      })

      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        manager.evaluate(`test${i}`, 'normal', 50, { high: 0, normal: 50, low: 0 })
      }
      const elapsed = performance.now() - start

      // 平均時間應 < 0.1ms
      expect(elapsed / 100).toBeLessThan(0.1)
    })
  })
})
