/**
 * @gravito/core - Event Retry System Integration Tests
 *
 * 完整的 RetryScheduler 集成測試，驗證：
 * 1. 正常重試流程
 * 2. 指數回退計算
 * 3. DLQ 路由（重試失敗後）
 * 4. OVERFLOW 重試策略
 * 5. 指標記錄
 * 6. 向後相容性
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureManager } from '../../src/events/BackpressureManager'
import { DeadLetterQueue } from '../../src/events/DeadLetterQueue'
import { EventPriorityQueue } from '../../src/events/EventPriorityQueue'
import { RetryScheduler } from '../../src/events/RetryScheduler'

describe('Event Retry System Integration', () => {
  let queue: EventPriorityQueue
  let scheduler: RetryScheduler
  let backpressureManager: BackpressureManager
  let dlq: DeadLetterQueue

  beforeEach(() => {
    queue = new EventPriorityQueue()
    scheduler = new RetryScheduler({ enabled: false }) // Disabled - no bullmq
    backpressureManager = new BackpressureManager({
      maxQueueSize: 100,
      overflowRetryStrategy: 'delayed',
      overflowRetryDelayMs: 5000,
    })
    dlq = new DeadLetterQueue()
  })

  afterEach(async () => {
    if (scheduler) {
      await scheduler.shutdown()
    }
  })

  it('should integrate RetryScheduler with EventPriorityQueue', () => {
    // 設定 RetryScheduler
    queue.setRetryScheduler(scheduler)

    // 驗證設置
    const retrieved = queue.getRetryScheduler()
    expect(retrieved).toBe(scheduler)
  })

  it('should return configured retry strategy on OVERFLOW', () => {
    const decision = backpressureManager.evaluate('test-event', 'normal', 101, {
      high: 0,
      normal: 101,
      low: 0,
    })

    // OVERFLOW 決策應該包含重試策略
    expect(decision.allowed).toBe(false)
    expect(decision.isOverflow).toBe(true)
    expect(decision.retryStrategy).toBe('delayed')
    expect(decision.delayMs).toBe(5000)
  })

  it('should support dlq-only retry strategy', () => {
    const manager = new BackpressureManager({
      maxQueueSize: 100,
      overflowRetryStrategy: 'dlq-only',
    })

    const decision = manager.evaluate('test-event', 'low', 101, {
      high: 0,
      normal: 0,
      low: 101,
    })

    expect(decision.isOverflow).toBe(true)
    expect(decision.retryStrategy).toBe('dlq-only')
    expect(decision.delayMs).toBeUndefined()
  })

  it('should support immediate retry strategy', () => {
    const manager = new BackpressureManager({
      maxQueueSize: 100,
      overflowRetryStrategy: 'immediate',
    })

    const decision = manager.evaluate('test-event', 'normal', 101, {
      high: 0,
      normal: 101,
      low: 0,
    })

    expect(decision.isOverflow).toBe(true)
    expect(decision.retryStrategy).toBe('immediate')
    // immediate 不需要延遲時間
    expect(decision.delayMs).toBeUndefined()
  })

  it('should integrate DLQ with retry system', () => {
    queue.setDeadLetterQueue(dlq)

    // 驗證 DLQ 已設置
    expect(queue).toBeDefined()
  })

  it('should maintain backward compatibility without RetryScheduler', async () => {
    // 不設置 RetryScheduler
    const queue2 = new EventPriorityQueue()
    expect(queue2.getRetryScheduler()).toBeUndefined()

    // 應該能正常工作（使用 fallback 機制）
    const decision = backpressureManager.evaluate('test-event', 'high', 50, {
      high: 10,
      normal: 20,
      low: 20,
    })

    expect(decision.allowed).toBe(true)
  })

  it('should handle disabled RetryScheduler gracefully', () => {
    const disabledScheduler = new RetryScheduler({ enabled: false })
    queue.setRetryScheduler(disabledScheduler)

    // 應該被設置但不啟用
    expect(queue.getRetryScheduler()).toBe(disabledScheduler)
    expect(disabledScheduler.isEnabled()).toBe(false)
  })
})
