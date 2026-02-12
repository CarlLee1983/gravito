/**
 * FS-103 背壓管理系統增強測試
 *
 * 測試 Phase 2 實施的核心功能：
 * - CRITICAL 優先級隊列監控
 * - 多優先級隊列深度同步
 * - 背壓反饋迴路
 * - DLQ 路由決策
 * - 狀態轉換和自動恢復
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureManager, BackpressureState } from '../../src/events/BackpressureManager'
import type { MultiPriorityQueueDepth } from '../../src/events/types'

describe('FS-103 背壓管理系統增強', () => {
  let manager: BackpressureManager

  beforeEach(() => {
    manager = new BackpressureManager({
      enabled: true,
      maxQueueSize: 100,
      maxSizeByPriority: {
        critical: 20,
        high: 30,
        normal: 30,
        low: 20,
      },
      thresholds: {
        warning: 0.6,
        critical: 0.85,
        overflow: 1.0,
      },
      dlqOnOverflow: true,
    })
  })

  // ===== Task 3.1：CRITICAL 隊列監控 =====
  describe('CRITICAL 優先級隊列監控', () => {
    it('應該單獨監控 CRITICAL 隊列深度', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 10,
        high: 5,
        normal: 5,
        low: 5,
        total: 25,
      }

      manager.updateQueueDepth(depths)

      const queued = manager.getQueueDepthByPriority()
      expect(queued.critical).toBe(10)
      expect(queued.total).toBe(25)
    })

    it('應該在 CRITICAL 隊列接近容量時觸發背壓', () => {
      // 達到 OVERFLOW 狀態（100% 或更多）
      // CRITICAL 隊列 > 90% 檢查，加上總隊列達到 OVERFLOW 狀態
      const depths: MultiPriorityQueueDepth = {
        critical: 19, // 95% of 20
        high: 20,
        normal: 31,
        low: 30,
        total: 100, // 達到 100% = OVERFLOW
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      const decision = manager.makeDeadLetterDecision('test:event', 'normal')
      expect(decision.shouldRoute).toBe(true)
      expect(decision.reason).toContain('CRITICAL')
    })

    it('應該正確計算 CRITICAL 隊列容量百分比', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 15, // 75% of 20
        high: 0,
        normal: 0,
        low: 0,
        total: 15,
      }

      manager.updateQueueDepth(depths)

      const queued = manager.getQueueDepthByPriority()
      const percent = (queued.critical / 20) * 100
      expect(percent).toBe(75)
    })
  })

  // ===== Task 3.2：隊列深度同步 =====
  describe('多優先級隊列深度同步', () => {
    it('應該同步來自 EventPriorityQueue 的隊列深度', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 5,
        high: 10,
        normal: 15,
        low: 8,
        total: 38,
      }

      manager.updateQueueDepth(depths)

      const stored = manager.getQueueDepthByPriority()
      expect(stored.critical).toBe(5)
      expect(stored.high).toBe(10)
      expect(stored.normal).toBe(15)
      expect(stored.low).toBe(8)
      expect(stored.total).toBe(38)
    })

    it('應該在隊列深度變化時更新狀態', () => {
      expect(manager.getState()).toBe(BackpressureState.NORMAL)

      // 隊列深度達到 WARNING 閾值（60%）
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 65,
        low: 0,
        total: 65,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.WARNING)
    })

    it('應該計算正確的總隊列深度', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 2,
        high: 3,
        normal: 4,
        low: 1,
        total: 10,
      }

      manager.updateQueueDepth(depths)

      expect(manager.getTotalQueueDepth()).toBe(10)
    })
  })

  // ===== Task 3.3：背壓反饋迴路 =====
  describe('背壓反饋迴路', () => {
    it('應該接收 AggregationWindow 的窗口調整通知', () => {
      // 進入 CRITICAL 狀態
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 接收窗口調整通知
      manager.notifyWindowAdjustment(200, 100)

      const metrics = manager.getMetrics()
      expect(metrics.windowAdjustmentCount).toBeGreaterThan(0)
    })

    it('應該在 CRITICAL 狀態下監控窗口大小變化', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      }

      manager.updateQueueDepth(depths)

      // 通知窗口從 200 調整到 100
      manager.notifyWindowAdjustment(200, 100)

      // 窗口縮小應該被記錄
      expect(manager.getMetrics().windowAdjustmentCount).toBeGreaterThan(0)
    })

    it('應該根據窗口調整決定狀態轉換', () => {
      // 進入 CRITICAL
      let depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 隊列開始排空
      depths = {
        critical: 0,
        high: 0,
        normal: 65,
        low: 0,
        total: 65,
      }

      manager.updateQueueDepth(depths)

      // 通知窗口調整（100 → 150）
      manager.notifyWindowAdjustment(100, 150)

      // 檢查是否恢復到 WARNING
      // 注：恢復需要隊列深度 <= 85% * 0.8 = 68%
      // 當前 65% < 68%，應該會降級到 WARNING
      const state = manager.getState()
      expect(state === BackpressureState.WARNING || state === BackpressureState.NORMAL).toBe(true)
    })
  })

  // ===== Task 3.4：DLQ 路由決策 =====
  describe('DLQ 路由決策', () => {
    it('應該在 OVERFLOW 狀態下路由低優先級事件到 DLQ', () => {
      // 進入 OVERFLOW
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        total: 100,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      const decision = manager.makeDeadLetterDecision('test:event', 'low')
      expect(decision.shouldRoute).toBe(true)
      expect(decision.reason).toContain('Low priority')
    })

    it('應該在 CRITICAL 隊列滿時路由 NORMAL 優先級事件到 DLQ', () => {
      // CRITICAL 隊列接近滿（> 90%），總隊列達到 OVERFLOW
      const depths: MultiPriorityQueueDepth = {
        critical: 19, // 95% of 20 (> 90%)
        high: 20,
        normal: 30,
        low: 31,
        total: 100, // 達到 100% = OVERFLOW
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      const decision = manager.makeDeadLetterDecision('test:event', 'normal')
      expect(decision.shouldRoute).toBe(true)
      expect(decision.reason).toContain('CRITICAL')
    })

    it('應該尊重 dlqOnOverflow 配置', () => {
      const managerNoDb = new BackpressureManager({
        enabled: true,
        maxQueueSize: 100,
        dlqOnOverflow: false, // 禁用 DLQ
      })

      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        total: 100,
      }

      managerNoDb.updateQueueDepth(depths)

      // 進入 OVERFLOW
      const decision = managerNoDb.makeDeadLetterDecision('test:event', 'low')
      expect(decision.shouldRoute).toBe(false)
      expect(decision.reason).toContain('disabled')
    })

    it('應該提供路由原因和重試策略建議', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        total: 100,
      }

      manager.updateQueueDepth(depths)

      const decision = manager.makeDeadLetterDecision('test:event', 'low')
      expect(decision.reason).toBeDefined()
      expect(decision.retryStrategy).toBeDefined()
      expect(['immediate', 'delayed', 'dlq-only']).toContain(decision.retryStrategy)
    })
  })

  // ===== Task 3.5：狀態轉換和恢復 =====
  describe('狀態轉換和自動恢復', () => {
    it('應該在隊列深度達到閾值時自動轉換狀態', () => {
      expect(manager.getState()).toBe(BackpressureState.NORMAL)

      // 達到 WARNING 閾值
      let depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 61,
        low: 0,
        total: 61,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 達到 CRITICAL 閾值
      depths = {
        critical: 0,
        high: 0,
        normal: 86,
        low: 0,
        total: 86,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 達到 OVERFLOW 閾值
      depths = {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        total: 100,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)
    })

    it('應該使用遲滯設計防止頻繁轉換', () => {
      // 進入 WARNING
      let depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 61,
        low: 0,
        total: 61,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 隊列深度略低於 WARNING 閾值但高於恢復點（80%）
      // WARNING 恢復點 = 60% * 0.8 = 48%
      depths = {
        critical: 0,
        high: 0,
        normal: 55,
        low: 0,
        total: 55,
      }

      manager.updateQueueDepth(depths)
      // 應該保持 WARNING（不會立即回到 NORMAL）
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 降至恢復點以下（< 48%）
      depths = {
        critical: 0,
        high: 0,
        normal: 47, // < 48% recovery point
        low: 0,
        total: 47,
      }

      manager.updateQueueDepth(depths)
      // 現在應該恢復到 NORMAL
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
    })

    it('應該在隊列深度降低時自動恢復', () => {
      // 進入 CRITICAL
      let depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 隊列開始排空至恢復點以下（85% * 0.8 = 68%）
      depths = {
        critical: 0,
        high: 0,
        normal: 65,
        low: 0,
        total: 65,
      }

      manager.updateQueueDepth(depths)

      // 通知窗口調整（增加窗口）以觸發恢復檢查
      manager.notifyWindowAdjustment(100, 150)

      // 應該恢復到 WARNING
      const state = manager.getState()
      expect(state === BackpressureState.WARNING || state === BackpressureState.NORMAL).toBe(true)
    })

    it('應該記錄窗口調整歷史', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      }

      manager.updateQueueDepth(depths)

      // 進行多次窗口調整
      manager.notifyWindowAdjustment(200, 100)
      manager.notifyWindowAdjustment(100, 150)
      manager.notifyWindowAdjustment(150, 200)

      const metrics = manager.getMetrics()
      expect(metrics.windowAdjustmentCount).toBeGreaterThan(0)
    })
  })

  // ===== 指標和監控 =====
  describe('監控指標', () => {
    it('應該在 getMetrics() 中包含 CRITICAL 優先級深度', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 5,
        high: 10,
        normal: 20,
        low: 8,
        total: 43,
      }

      manager.updateQueueDepth(depths)

      const metrics = manager.getMetrics()
      expect(metrics.depthByPriority.critical).toBe(5)
      expect(metrics.depthByPriority.high).toBe(10)
      expect(metrics.depthByPriority.normal).toBe(20)
      expect(metrics.depthByPriority.low).toBe(8)
    })

    it('應該追蹤 DLQ 路由計數', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
        total: 100,
      }

      manager.updateQueueDepth(depths)

      // 進行 DLQ 路由
      manager.makeDeadLetterDecision('event1', 'low')
      manager.makeDeadLetterDecision('event2', 'low')

      const metrics = manager.getMetrics()
      expect(metrics.dlqRouteCount).toBeGreaterThan(0)
    })

    it('應該在 reset() 後清除所有狀態', () => {
      const depths: MultiPriorityQueueDepth = {
        critical: 5,
        high: 10,
        normal: 20,
        low: 8,
        total: 43,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getTotalQueueDepth()).toBeGreaterThan(0)

      manager.reset()

      expect(manager.getState()).toBe(BackpressureState.NORMAL)
      expect(manager.getTotalQueueDepth()).toBe(0)
      expect(manager.getMetrics().dlqRouteCount).toBe(0)
    })
  })

  // ===== 端到端集成測試 =====
  describe('端到端場景測試', () => {
    it('應該在高並發時自動升級狀態並恢復', () => {
      // 初始正常狀態
      expect(manager.getState()).toBe(BackpressureState.NORMAL)

      // 模擬事件不斷入隊
      manager.updateQueueDepth({
        critical: 2,
        high: 10,
        normal: 30,
        low: 10,
        total: 52,
      })
      expect(manager.getState()).toBe(BackpressureState.NORMAL)

      // 隊列深度達到 WARNING (60%)
      manager.updateQueueDepth({
        critical: 5,
        high: 15,
        normal: 35,
        low: 10,
        total: 65,
      })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 繼續增加到 CRITICAL (85%)
      manager.updateQueueDepth({
        critical: 10,
        high: 20,
        normal: 40,
        low: 20,
        total: 90,
      })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 進入 OVERFLOW (100%)
      manager.updateQueueDepth({
        critical: 15,
        high: 20,
        normal: 35,
        low: 30,
        total: 100,
      })
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      // DLQ 應該開始路由事件
      const decision = manager.makeDeadLetterDecision('test:event', 'low')
      expect(decision.shouldRoute).toBe(true)

      // 隊列開始排空至 CRITICAL 恢復點 (68%)
      manager.updateQueueDepth({
        critical: 10,
        high: 15,
        normal: 30,
        low: 13,
        total: 68,
      })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 繼續排空至 WARNING 恢復點 (48%)
      manager.updateQueueDepth({
        critical: 3,
        high: 8,
        normal: 25,
        low: 12,
        total: 48,
      })
      expect(manager.getState()).toBe(BackpressureState.WARNING)

      // 最後排空至正常狀態 (< 48%)
      manager.updateQueueDepth({
        critical: 2,
        high: 5,
        normal: 15,
        low: 10,
        total: 32,
      })
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
    })

    it('應該正確處理優先級飢餓防護', () => {
      // CRITICAL 隊列有事件，即使系統過載也應該被處理
      const depths: MultiPriorityQueueDepth = {
        critical: 10,
        high: 20,
        normal: 30,
        low: 40,
        total: 100,
      }

      manager.updateQueueDepth(depths)
      expect(manager.getState()).toBe(BackpressureState.OVERFLOW)

      // CRITICAL 優先級事件在 OVERFLOW 之外永不拒絕
      const criticalDecision = manager.makeDeadLetterDecision('critical:event', 'critical')
      expect(criticalDecision.shouldRoute).toBe(false)

      // LOW 優先級會被拒絕
      const lowDecision = manager.makeDeadLetterDecision('low:event', 'low')
      expect(lowDecision.shouldRoute).toBe(true)
    })

    it('應該追蹤完整的狀態轉換歷史', () => {
      const transitions: { from: BackpressureState; to: BackpressureState }[] = []

      // 創建有回調的新 manager
      const managerWithCallback = new BackpressureManager({
        enabled: true,
        maxQueueSize: 100,
        onStateChange: (from, to) => {
          transitions.push({ from, to })
        },
      })

      // 觸發多次轉換
      managerWithCallback.updateQueueDepth({
        critical: 0,
        high: 0,
        normal: 65,
        low: 0,
        total: 65,
      })

      managerWithCallback.updateQueueDepth({
        critical: 0,
        high: 0,
        normal: 90,
        low: 0,
        total: 90,
      })

      managerWithCallback.updateQueueDepth({
        critical: 0,
        high: 0,
        normal: 100,
        low: 0,
        total: 100,
      })

      // 應該有轉換記錄
      expect(transitions.length).toBeGreaterThan(0)
      expect(transitions[0].from).toBe(BackpressureState.NORMAL)
    })

    it('應該支持完整的窗口調整反饋迴路', () => {
      // 進入 CRITICAL 狀態
      manager.updateQueueDepth({
        critical: 0,
        high: 0,
        normal: 87,
        low: 0,
        total: 87,
      })
      expect(manager.getState()).toBe(BackpressureState.CRITICAL)

      // 接收多次窗口調整通知
      manager.notifyWindowAdjustment(200, 100) // 縮小窗口
      manager.notifyWindowAdjustment(100, 150) // 擴大窗口

      // 隊列開始排空至恢復點以下 (< 68% 才能從 CRITICAL 回到 WARNING)
      manager.updateQueueDepth({
        critical: 0,
        high: 0,
        normal: 60,
        low: 0,
        total: 60,
      })

      // 檢查窗口調整歷史
      const metrics = manager.getMetrics()
      expect(metrics.windowAdjustmentCount).toBeGreaterThan(0)

      // 應該恢復至少到 WARNING（60 < 68 恢復點）
      const state = manager.getState()
      expect(state === BackpressureState.WARNING || state === BackpressureState.NORMAL).toBe(true)
    })
  })
})
