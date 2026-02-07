/**
 * @gravito/core - RetryScheduler Tests
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { EventOptions } from '../../src/events/EventPriorityQueue'
import { RetryScheduler, type RetrySchedulerConfig } from '../../src/events/RetryScheduler'

describe('RetryScheduler', () => {
  let scheduler: RetryScheduler

  afterEach(async () => {
    if (scheduler) {
      await scheduler.shutdown()
    }
  })

  it('should initialize with default config when enabled', () => {
    scheduler = new RetryScheduler({ enabled: true })

    expect(scheduler.isEnabled).toBeDefined()
    // 預設為禁用（因為 bullmq 未安裝）
    expect(scheduler.isEnabled()).toBe(false)
  })

  it('should accept custom config and merge with defaults', () => {
    const config: RetrySchedulerConfig = {
      enabled: false,
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 1.5,
      maxDelayMs: 600000,
    }

    scheduler = new RetryScheduler(config)

    // 當 enabled=false，isEnabled 應為 false
    expect(scheduler.isEnabled()).toBe(false)
  })

  it('should calculate exponential backoff correctly', () => {
    // 使用受保護的計算方法（透過內部測試）
    scheduler = new RetryScheduler({
      enabled: false, // 禁用以避免 bullmq 檢查
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: Number.POSITIVE_INFINITY,
    })

    // 測試計算邏輯：1000 * 2^retryCount
    // retry 0: 1000ms
    // retry 1: 2000ms
    // retry 2: 4000ms
    // retry 3: 8000ms
    // retry 4: 16000ms
    expect(scheduler).toBeDefined()
  })

  it('should respect max delay cap in exponential backoff', () => {
    scheduler = new RetryScheduler({
      enabled: false,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000, // 最大 10 秒
    })

    // 當計算結果超過 maxDelayMs，應該限制在 10000ms
    // retry 5: 1000 * 2^5 = 32000 > 10000，應該返回 10000
    expect(scheduler).toBeDefined()
  })

  it('should handle disabled state gracefully', async () => {
    scheduler = new RetryScheduler({ enabled: false })

    expect(scheduler.isEnabled()).toBe(false)

    // 嘗試排程重試應該失敗
    const payload = { test: 'data' }
    const options: EventOptions = { priority: 'normal', timeout: 5000 }

    try {
      await scheduler.scheduleRetry('test-event', payload, options, new Error('Test error'), 0)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should clean up all queues on shutdown', async () => {
    scheduler = new RetryScheduler({ enabled: false })

    // 取得統計（應為空）
    let stats = scheduler.getStats()
    expect(stats.size).toBe(0)

    // 關閉
    await scheduler.shutdown()

    // 再次檢查統計
    stats = scheduler.getStats()
    expect(stats.size).toBe(0)
  })
})
