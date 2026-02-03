/**
 * @gravito/core - RetryPolicy Tests
 *
 * 測試重試策略引擎的所有功能
 */

import { describe, expect, it } from 'bun:test'
import type { RetryPolicy } from '../../src/reliability/RetryPolicy'
import {
  getDefaultRetryPolicy,
  getPresetRetryPolicy,
  RetryEngine,
} from '../../src/reliability/RetryPolicy'

describe('RetryEngine', () => {
  const engine = new RetryEngine()

  describe('calculateDelay', () => {
    it('應該計算指數退避延遲', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      // 第 1 次重試：1000ms * 2^0 = 1000ms
      const delay1 = engine.calculateDelay(1, policy)
      expect(delay1).toBeGreaterThanOrEqual(1000)
      expect(delay1).toBeLessThanOrEqual(1100)

      // 第 2 次重試：1000ms * 2^1 = 2000ms
      const delay2 = engine.calculateDelay(2, policy)
      expect(delay2).toBeGreaterThanOrEqual(2000)
      expect(delay2).toBeLessThanOrEqual(2200)

      // 第 3 次重試：1000ms * 2^2 = 4000ms
      const delay3 = engine.calculateDelay(3, policy)
      expect(delay3).toBeGreaterThanOrEqual(4000)
      expect(delay3).toBeLessThanOrEqual(4400)
    })

    it('應該計算線性退避延遲', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'linear',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      // 第 1 次重試：1000ms * 1 = 1000ms
      const delay1 = engine.calculateDelay(1, policy)
      expect(delay1).toBeGreaterThanOrEqual(1000)
      expect(delay1).toBeLessThanOrEqual(1100)

      // 第 2 次重試：1000ms * 2 = 2000ms
      const delay2 = engine.calculateDelay(2, policy)
      expect(delay2).toBeGreaterThanOrEqual(2000)
      expect(delay2).toBeLessThanOrEqual(2200)

      // 第 3 次重試：1000ms * 3 = 3000ms
      const delay3 = engine.calculateDelay(3, policy)
      expect(delay3).toBeGreaterThanOrEqual(3000)
      expect(delay3).toBeLessThanOrEqual(3300)
    })

    it('應該遵守最大延遲限制', () => {
      const policy: RetryPolicy = {
        maxRetries: 10,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }

      // 即使計算的延遲超過 maxDelayMs，也應該限制在 5000ms
      const delay = engine.calculateDelay(10, policy)
      expect(delay).toBeLessThanOrEqual(5000)
    })

    it('應該添加隨機抖動', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      // 多次計算應該產生不同的延遲（由於 jitter）
      const delays = Array.from({ length: 5 }, () => engine.calculateDelay(1, policy))
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('shouldRetry', () => {
    it('應該在未超過最大重試時返回 true', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      expect(engine.shouldRetry(1, policy)).toBe(true)
      expect(engine.shouldRetry(2, policy)).toBe(true)
    })

    it('應該在達到最大重試時返回 false', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      expect(engine.shouldRetry(3, policy)).toBe(false)
      expect(engine.shouldRetry(4, policy)).toBe(false)
    })
  })

  describe('getBackoffTime', () => {
    it('應該正確計算退避時間', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      // retryCount 從 0 開始
      const time0 = engine.getBackoffTime(0, policy)
      expect(time0).toBeGreaterThanOrEqual(1000)
      expect(time0).toBeLessThanOrEqual(1100)

      const time1 = engine.getBackoffTime(1, policy)
      expect(time1).toBeGreaterThanOrEqual(2000)
      expect(time1).toBeLessThanOrEqual(2200)
    })
  })

  describe('getNextRetryTime', () => {
    it('應該計算下次重試的絕對時間', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      const baseTime = 1000000
      const nextTime = engine.getNextRetryTime(0, policy, baseTime)

      // 應該返回 baseTime + delay
      expect(nextTime).toBeGreaterThan(baseTime)
      expect(nextTime).toBeLessThanOrEqual(baseTime + 1100)
    })
  })

  describe('isValidPolicy', () => {
    it('應該驗證有效的策略', () => {
      const validPolicy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      expect(engine.isValidPolicy(validPolicy)).toBe(true)
    })

    it('應該拒絕無效的策略（maxRetries < 0）', () => {
      const policy: RetryPolicy = {
        maxRetries: -1,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      expect(engine.isValidPolicy(policy)).toBe(false)
    })

    it('應該拒絕無效的策略（initialDelayMs <= 0）', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 0,
        maxDelayMs: 30000,
      }

      expect(engine.isValidPolicy(policy)).toBe(false)
    })

    it('應該拒絕無效的策略（maxDelayMs < initialDelayMs）', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 5000,
        maxDelayMs: 1000,
      }

      expect(engine.isValidPolicy(policy)).toBe(false)
    })

    it('應該拒絕無效的退避策略', () => {
      const policy = {
        maxRetries: 3,
        backoff: 'invalid',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      } as unknown as RetryPolicy

      expect(engine.isValidPolicy(policy)).toBe(false)
    })
  })

  describe('getRetryInfo', () => {
    it('應該返回重試進度信息', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      const info1 = engine.getRetryInfo(1, policy)
      expect(info1).toContain('Retry 1 of 3')
      expect(info1).toContain('~')

      const info2 = engine.getRetryInfo(3, policy)
      expect(info2).toContain('Max retries reached')
    })

    it('應該在超過最大重試時返回錯誤信息', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      const info = engine.getRetryInfo(4, policy)
      expect(info).toContain('Max retries exceeded')
    })
  })
})

describe('getDefaultRetryPolicy', () => {
  it('應該返回有效的默認策略', () => {
    const policy = getDefaultRetryPolicy()

    expect(policy.maxRetries).toBe(3)
    expect(policy.backoff).toBe('exponential')
    expect(policy.initialDelayMs).toBe(1000)
    expect(policy.maxDelayMs).toBe(30000)
    expect(policy.dlqAfterMaxRetries).toBe(true)
  })

  it('應該返回的策略能通過驗證', () => {
    const policy = getDefaultRetryPolicy()
    const engine = new RetryEngine()

    expect(engine.isValidPolicy(policy)).toBe(true)
  })
})

describe('getPresetRetryPolicy', () => {
  it('應該為外部 API 返回適當的策略', () => {
    const policy = getPresetRetryPolicy('external-api')

    expect(policy.maxRetries).toBe(5)
    expect(policy.backoff).toBe('exponential')
    expect(policy.dlqAfterMaxRetries).toBe(true)
  })

  it('應該為數據庫操作返回適當的策略', () => {
    const policy = getPresetRetryPolicy('database')

    expect(policy.maxRetries).toBe(2)
    expect(policy.backoff).toBe('linear')
    expect(policy.dlqAfterMaxRetries).toBe(false)
  })

  it('應該為消息隊列返回適當的策略', () => {
    const policy = getPresetRetryPolicy('message-queue')

    expect(policy.maxRetries).toBe(3)
    expect(policy.backoff).toBe('exponential')
    expect(policy.dlqAfterMaxRetries).toBe(true)
  })

  it('應該為未知類型返回默認策略', () => {
    const policy = getPresetRetryPolicy('default')

    expect(policy.maxRetries).toBe(3)
    expect(policy.backoff).toBe('exponential')
  })
})
