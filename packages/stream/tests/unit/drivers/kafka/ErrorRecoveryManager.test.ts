import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { ErrorRecoveryManager } from '../../../../src/drivers/kafka/ErrorRecoveryManager'
import type { KafkaCircuitState } from '../../../../src/drivers/kafka/types'

describe('ErrorRecoveryManager', () => {
  let manager: ErrorRecoveryManager

  beforeEach(() => {
    manager = new ErrorRecoveryManager({
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

  afterEach(() => {
    manager.destroy()
  })

  // --- 初始化 ---

  describe('初始化', () => {
    test('使用預設配置建立', () => {
      const defaultManager = new ErrorRecoveryManager()
      const state = defaultManager.getState()
      expect(state.circuitState).toBe('CLOSED')
      expect(state.consecutiveFailures).toBe(0)
      expect(state.lastFailureTime).toBe(0)
      expect(state.currentBackoffMs).toBe(0)
      expect(state.totalRecoveries).toBe(0)
      expect(state.isRecovering).toBe(false)
      defaultManager.destroy()
    })

    test('使用自訂配置建立', () => {
      const state = manager.getState()
      expect(state.circuitState).toBe('CLOSED')
      expect(state.consecutiveFailures).toBe(0)
      expect(state.isRecovering).toBe(false)
    })
  })

  // --- 電路斷路器狀態轉換 ---

  describe('電路斷路器轉換', () => {
    test('CLOSED → OPEN: 失敗閾值觸發', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.getState().circuitState).toBe('OPEN')
    })

    test('OPEN → HALF_OPEN: 重置逾時後轉換', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.getState().circuitState).toBe('OPEN')

      // 等待 resetTimeoutMs (100ms) 後轉換到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('HALF_OPEN')
    })

    test('HALF_OPEN → CLOSED: 探測成功', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('HALF_OPEN')

      // 成功記錄 → CLOSED
      manager.recordSuccess()
      expect(manager.getState().circuitState).toBe('CLOSED')
    })

    test('HALF_OPEN → OPEN: 探測失敗重新打開', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('HALF_OPEN')

      // 失敗 → 重新 OPEN
      manager.recordFailure(error)
      expect(manager.getState().circuitState).toBe('OPEN')
    })

    test('CLOSED 狀態下少於閾值的失敗不會打開電路', () => {
      const error = new Error('test failure')
      manager.recordFailure(error)
      manager.recordFailure(error)
      expect(manager.getState().circuitState).toBe('CLOSED')
      expect(manager.getState().consecutiveFailures).toBe(2)
    })

    test('完整週期: CLOSED → OPEN → HALF_OPEN → CLOSED', async () => {
      const states: KafkaCircuitState[] = []
      manager.on('circuit:open', () => states.push('OPEN'))
      manager.on('circuit:half-open', () => states.push('HALF_OPEN'))
      manager.on('circuit:closed', () => states.push('CLOSED'))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))
      manager.recordSuccess()

      expect(states).toEqual(['OPEN', 'HALF_OPEN', 'CLOSED'])
    })
  })

  // --- canProceed ---

  describe('canProceed()', () => {
    test('CLOSED 狀態返回 true', () => {
      expect(manager.canProceed()).toBe(true)
    })

    test('OPEN 狀態返回 false', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.canProceed()).toBe(false)
    })

    test('HALF_OPEN 狀態限制探測請求數量', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('HALF_OPEN')

      // halfOpenMaxRequests = 1, 第一次允許
      expect(manager.canProceed()).toBe(true)
      // 第二次拒絕
      expect(manager.canProceed()).toBe(false)
    })
  })

  // --- 退避延遲計算 ---

  describe('退避延遲計算', () => {
    test('指數退避增長 (無抖動)', () => {
      const error = new Error('test failure')

      // 1 次失敗: 10 * 2^0 = 10
      manager.recordFailure(error)
      expect(manager.getBackoffDelay()).toBe(10)

      // 2 次失敗: 10 * 2^1 = 20
      manager.recordFailure(error)
      expect(manager.getBackoffDelay()).toBe(20)

      // 3 次失敗: 10 * 2^2 = 40
      manager.recordFailure(error)
      expect(manager.getBackoffDelay()).toBe(40)
    })

    test('最大退避上限', () => {
      const error = new Error('test failure')
      // 填滿失敗直到超過 maxBackoffMs
      for (let i = 0; i < 10; i++) {
        manager.recordFailure(error)
      }
      // maxRetries=5, 所以 attempt = min(10, 5) = 5
      // 10 * 2^4 = 160, 不超過 200
      const delay = manager.getBackoffDelay()
      expect(delay).toBeLessThanOrEqual(200)
    })

    test('抖動產生變異的延遲', () => {
      const jitterManager = new ErrorRecoveryManager({
        failureThreshold: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 10000,
        backoffMultiplier: 2,
        jitter: true,
        maxRetries: 10,
      })

      const error = new Error('test failure')
      jitterManager.recordFailure(error)

      // 基礎延遲 = 100, 抖動範圍 = [50, 100]
      const delays = new Set<number>()
      for (let i = 0; i < 20; i++) {
        delays.add(jitterManager.getBackoffDelay())
      }

      // 抖動應產生不同的值（機率極高）
      expect(delays.size).toBeGreaterThan(1)

      // 所有值應在 [50, 100] 範圍
      for (const d of delays) {
        expect(d).toBeGreaterThanOrEqual(50)
        expect(d).toBeLessThanOrEqual(100)
      }

      jitterManager.destroy()
    })

    test('成功時退避重置', () => {
      const error = new Error('test failure')
      manager.recordFailure(error)
      manager.recordFailure(error)
      expect(manager.getBackoffDelay()).toBe(20)

      manager.recordSuccess()
      expect(manager.getState().consecutiveFailures).toBe(0)
      expect(manager.getState().currentBackoffMs).toBe(0)
    })
  })

  // --- waitForBackoff ---

  describe('waitForBackoff()', () => {
    test('實際等待退避延遲', async () => {
      const error = new Error('test failure')
      manager.recordFailure(error)

      const start = Date.now()
      await manager.waitForBackoff()
      const elapsed = Date.now() - start

      // 預期延遲 ~10ms (無抖動)
      expect(elapsed).toBeGreaterThanOrEqual(5)
    })
  })

  // --- 事件發射 ---

  describe('事件發射', () => {
    test('circuit:open 事件在電路打開時發出', () => {
      const events: unknown[] = []
      manager.on('circuit:open', (payload) => events.push(payload))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      expect(events.length).toBe(1)
      expect(events[0]).toEqual({ previousState: 'CLOSED' })
    })

    test('circuit:half-open 事件在允許探測時發出', async () => {
      const events: unknown[] = []
      manager.on('circuit:half-open', (payload) => events.push(payload))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(events.length).toBe(1)
      expect(events[0]).toEqual({ previousState: 'OPEN' })
    })

    test('circuit:closed 事件在電路恢復時發出', async () => {
      const events: unknown[] = []
      manager.on('circuit:closed', (payload) => events.push(payload))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))
      manager.recordSuccess()

      expect(events.length).toBe(1)
      expect(events[0]).toEqual({ previousState: 'HALF_OPEN' })
    })

    test('recovery:backoff 事件在進入退避期發出', () => {
      const events: unknown[] = []
      manager.on('recovery:backoff', (payload) => events.push(payload))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      expect(events.length).toBe(1)
    })

    test('recovery:success 事件在成功恢復時發出', async () => {
      const events: unknown[] = []
      manager.on('recovery:success', () => events.push('success'))

      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))
      manager.recordSuccess()

      expect(events.length).toBe(1)
      expect(events[0]).toBe('success')
    })
  })

  // --- reset ---

  describe('reset()', () => {
    test('強制重置為 CLOSED', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.getState().circuitState).toBe('OPEN')

      manager.reset()
      const state = manager.getState()
      expect(state.circuitState).toBe('CLOSED')
      expect(state.consecutiveFailures).toBe(0)
      expect(state.lastFailureTime).toBe(0)
      expect(state.isRecovering).toBe(false)
    })

    test('已經 CLOSED 時 reset 不發出事件', () => {
      const events: string[] = []
      manager.on('circuit:closed', () => events.push('closed'))

      manager.reset()
      expect(events.length).toBe(0)
    })

    test('reset 清除排程的計時器', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      manager.reset()
      expect(manager.getState().circuitState).toBe('CLOSED')

      // 等待超過 resetTimeoutMs, 不應轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('CLOSED')
    })
  })

  // --- getState 精確度 ---

  describe('getState() 精確度', () => {
    test('初始狀態正確', () => {
      const state = manager.getState()
      expect(state.circuitState).toBe('CLOSED')
      expect(state.consecutiveFailures).toBe(0)
      expect(state.lastFailureTime).toBe(0)
      expect(state.currentBackoffMs).toBe(0)
      expect(state.totalRecoveries).toBe(0)
      expect(state.isRecovering).toBe(false)
    })

    test('失敗後狀態正確', () => {
      const error = new Error('test failure')
      manager.recordFailure(error)

      const state = manager.getState()
      expect(state.consecutiveFailures).toBe(1)
      expect(state.lastFailureTime).toBeGreaterThan(0)
      expect(state.currentBackoffMs).toBe(10)
    })

    test('totalRecoveries 精確累計', async () => {
      const error = new Error('test failure')

      // 第一次恢復
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
      manager.recordSuccess()
      expect(manager.getState().totalRecoveries).toBe(1)

      // 第二次恢復
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
      manager.recordSuccess()
      expect(manager.getState().totalRecoveries).toBe(2)
    })

    test('isRecovering 在非 CLOSED 狀態返回 true', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.getState().isRecovering).toBe(true)
    })
  })

  // --- 最大重試限制 ---

  describe('最大重試限制', () => {
    test('hasExceededMaxRetries 在超過限制時返回 true', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 4; i++) {
        manager.recordFailure(error)
      }
      expect(manager.hasExceededMaxRetries()).toBe(false)

      manager.recordFailure(error)
      expect(manager.hasExceededMaxRetries()).toBe(true)
    })

    test('退避延遲在最大重試後被截斷', () => {
      const error = new Error('test failure')
      for (let i = 0; i < 10; i++) {
        manager.recordFailure(error)
      }

      // maxRetries=5, 所以 attempt 被限制在 5
      // 10 * 2^4 = 160, 不超過 maxBackoffMs=200
      const delay = manager.getBackoffDelay()
      expect(delay).toBe(160)
    })
  })

  // --- 並行失敗記錄 ---

  describe('並行失敗記錄', () => {
    test('快速連續失敗正確計數', () => {
      const error = new Error('test failure')
      // 同步快速記錄多次失敗
      manager.recordFailure(error)
      manager.recordFailure(error)
      manager.recordFailure(error)
      manager.recordFailure(error)

      expect(manager.getState().consecutiveFailures).toBe(4)
      expect(manager.getState().circuitState).toBe('OPEN')
    })
  })

  // --- 延長 OPEN 期後恢復 ---

  describe('延長 OPEN 期後恢復', () => {
    test('OPEN 狀態等待後可以恢復', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }
      expect(manager.getState().circuitState).toBe('OPEN')

      // 等待重置逾時 + 額外時間
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(manager.getState().circuitState).toBe('HALF_OPEN')

      // 成功探測
      manager.recordSuccess()
      expect(manager.getState().circuitState).toBe('CLOSED')
      expect(manager.getState().consecutiveFailures).toBe(0)
    })
  })

  // --- destroy 清理 ---

  describe('destroy()', () => {
    test('清理計時器和監聽器', async () => {
      const error = new Error('test failure')
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(error)
      }

      manager.destroy()

      // 計時器已清除，等待後不應轉換
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(manager.getState().circuitState).toBe('OPEN')

      // 監聽器已移除
      expect(manager.listenerCount('circuit:open')).toBe(0)
    })
  })
})
