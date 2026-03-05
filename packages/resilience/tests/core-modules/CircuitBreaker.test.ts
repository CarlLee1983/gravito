import { beforeEach, describe, expect, it } from 'bun:test'
import type { CircuitBreakerMetricsRecorder } from '../../src/circuit-breaker/CircuitBreaker'
import { CircuitBreaker, CircuitBreakerState } from '../../src/circuit-breaker/CircuitBreaker'
import { delay } from '../helpers'

// ---------------------------------------------------------------------------
// Mock MetricsRecorder
// ---------------------------------------------------------------------------
function createMockRecorder(): CircuitBreakerMetricsRecorder & {
  calls: Record<string, unknown[][]>
} {
  const calls: Record<string, unknown[][]> = {
    recordState: [],
    recordTransition: [],
    recordFailure: [],
    recordSuccess: [],
    recordOpenDuration: [],
  }
  return {
    calls,
    recordState(_eventName: string, _state: number) {
      calls.recordState.push([_eventName, _state])
    },
    recordTransition(_eventName: string, _from: string, _to: string) {
      calls.recordTransition.push([_eventName, _from, _to])
    },
    recordFailure(_eventName: string) {
      calls.recordFailure.push([_eventName])
    },
    recordSuccess(_eventName: string) {
      calls.recordSuccess.push([_eventName])
    },
    recordOpenDuration(_eventName: string, _seconds: number) {
      calls.recordOpenDuration.push([_eventName, _seconds])
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 讓 breaker 進入 OPEN 狀態 */
async function tripBreaker(cb: CircuitBreaker, failures: number): Promise<void> {
  for (let i = 0; i < failures; i++) {
    try {
      await cb.execute(async () => {
        throw new Error('fail')
      })
    } catch {
      // 預期拋錯
    }
  }
}

// =========================================================================
// Tests
// =========================================================================

describe('CircuitBreaker', () => {
  // -----------------------------------------------------------------------
  // 1. 建構子多載
  // -----------------------------------------------------------------------
  describe('constructor overloads', () => {
    it('creates with default name when no arguments', () => {
      const cb = new CircuitBreaker()
      expect(cb.getName()).toBe('circuit-breaker')
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('creates with string name + default options', () => {
      const cb = new CircuitBreaker('my-cb')
      expect(cb.getName()).toBe('my-cb')
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('creates with options only (no name)', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 })
      expect(cb.getName()).toBe('circuit-breaker')
      // 驗證自訂選項生效：3 次失敗即 OPEN
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('creates with name + options', () => {
      const recorder = createMockRecorder()
      const cb = new CircuitBreaker('named', {
        failureThreshold: 2,
        metricsRecorder: recorder,
      })
      expect(cb.getName()).toBe('named')
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  // -----------------------------------------------------------------------
  // 2. 狀態機：CLOSED -> OPEN
  // -----------------------------------------------------------------------
  describe('state machine: CLOSED -> OPEN', () => {
    let cb: CircuitBreaker

    beforeEach(() => {
      cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 60_000, // 大值，防止自動轉 HALF_OPEN
      })
    })

    it('stays CLOSED when failures < threshold', async () => {
      await tripBreaker(cb, 2)
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(cb.getFailureCount()).toBe(2)
    })

    it('transitions to OPEN when failures reach threshold', async () => {
      await tripBreaker(cb, 3)
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('rejects execute() when OPEN', async () => {
      await tripBreaker(cb, 3)
      expect(cb.isOpen()).toBe(true)

      await expect(cb.execute(async () => 'should not run')).rejects.toThrow('Circuit is OPEN')
    })

    it('calls onOpen callback when transitioning to OPEN', async () => {
      let calledWith: string | undefined
      const cb2 = new CircuitBreaker('cb-open', {
        failureThreshold: 2,
        resetTimeout: 60_000,
        onOpen: (name) => {
          calledWith = name
        },
      })
      await tripBreaker(cb2, 2)
      expect(calledWith).toBe('cb-open')
    })

    it('records metrics on failure', async () => {
      const recorder = createMockRecorder()
      const cb2 = new CircuitBreaker('metrics-cb', {
        failureThreshold: 2,
        resetTimeout: 60_000,
        metricsRecorder: recorder,
      })
      await tripBreaker(cb2, 2)

      expect(recorder.calls.recordFailure.length).toBe(2)
      // 轉換 CLOSED -> OPEN
      expect(recorder.calls.recordTransition.length).toBe(1)
      expect(recorder.calls.recordTransition[0]).toEqual(['metrics-cb', 'CLOSED', 'OPEN'])
    })
  })

  // -----------------------------------------------------------------------
  // 3. 狀態機：OPEN 行為
  // -----------------------------------------------------------------------
  describe('state machine: OPEN behavior', () => {
    let cb: CircuitBreaker

    beforeEach(async () => {
      cb = new CircuitBreaker('open-test', {
        failureThreshold: 2,
        resetTimeout: 60_000, // 不會自動轉換
      })
      await tripBreaker(cb, 2)
    })

    it('isOpen() returns true', () => {
      expect(cb.isOpen()).toBe(true)
    })

    it('isClosed() returns false', () => {
      expect(cb.isClosed()).toBe(false)
    })

    it('isHalfOpen() returns false', () => {
      expect(cb.isHalfOpen()).toBe(false)
    })

    it('throws with breaker name in error message', async () => {
      await expect(cb.execute(async () => 'nope')).rejects.toThrow('Circuit is OPEN for open-test')
    })
  })

  // -----------------------------------------------------------------------
  // 4. 狀態機：OPEN -> HALF_OPEN
  // -----------------------------------------------------------------------
  describe('state machine: OPEN -> HALF_OPEN', () => {
    it('transitions to HALF_OPEN after resetTimeout expires', async () => {
      const cb = new CircuitBreaker('ho-test', {
        failureThreshold: 2,
        resetTimeout: 50,
      })
      await tripBreaker(cb, 2)
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)

      await delay(60)
      // checkStateTransition 由 isOpen() 觸發
      expect(cb.isOpen()).toBe(false)
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })

    it('calls onHalfOpen callback', async () => {
      let calledWith: string | undefined
      const cb = new CircuitBreaker('ho-cb', {
        failureThreshold: 2,
        resetTimeout: 50,
        onHalfOpen: (name) => {
          calledWith = name
        },
      })
      await tripBreaker(cb, 2)

      await delay(60)
      cb.isOpen() // 觸發轉換
      expect(calledWith).toBe('ho-cb')
    })

    it('records transition metrics for OPEN -> HALF_OPEN', async () => {
      const recorder = createMockRecorder()
      const cb = new CircuitBreaker('ho-metrics', {
        failureThreshold: 2,
        resetTimeout: 50,
        metricsRecorder: recorder,
      })
      await tripBreaker(cb, 2)

      await delay(60)
      cb.isOpen()

      // 應有 CLOSED->OPEN 和 OPEN->HALF_OPEN 兩次轉換
      expect(recorder.calls.recordTransition.length).toBe(2)
      expect(recorder.calls.recordTransition[1]).toEqual(['ho-metrics', 'OPEN', 'HALF_OPEN'])
      // 記錄 OPEN 持續時間
      expect(recorder.calls.recordOpenDuration.length).toBe(1)
    })
  })

  // -----------------------------------------------------------------------
  // 5. 狀態機：HALF_OPEN -> CLOSED
  // -----------------------------------------------------------------------
  describe('state machine: HALF_OPEN -> CLOSED', () => {
    let cb: CircuitBreaker

    beforeEach(async () => {
      cb = new CircuitBreaker('hoc-test', {
        failureThreshold: 2,
        resetTimeout: 50,
        successThreshold: 2,
      })
      await tripBreaker(cb, 2)
      await delay(60)
      cb.isOpen() // 轉為 HALF_OPEN
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })

    it('transitions to CLOSED after successThreshold successes', async () => {
      await cb.execute(async () => 'ok1')
      await cb.execute(async () => 'ok2')
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('resets failure count after closing', async () => {
      await cb.execute(async () => 'ok1')
      await cb.execute(async () => 'ok2')
      expect(cb.getFailureCount()).toBe(0)
    })

    it('calls onClose callback', async () => {
      let calledWith: string | undefined
      const cb2 = new CircuitBreaker('close-cb', {
        failureThreshold: 2,
        resetTimeout: 50,
        successThreshold: 1,
        onClose: (name) => {
          calledWith = name
        },
      })
      await tripBreaker(cb2, 2)
      await delay(60)
      cb2.isOpen()

      await cb2.execute(async () => 'ok')
      expect(calledWith).toBe('close-cb')
    })

    it('returns operation result in HALF_OPEN', async () => {
      const result = await cb.execute(async () => 42)
      expect(result).toBe(42)
    })
  })

  // -----------------------------------------------------------------------
  // 6. 狀態機：HALF_OPEN -> OPEN 回退
  // -----------------------------------------------------------------------
  describe('state machine: HALF_OPEN -> OPEN fallback', () => {
    let cb: CircuitBreaker

    beforeEach(async () => {
      cb = new CircuitBreaker('fallback-test', {
        failureThreshold: 2,
        resetTimeout: 50,
        successThreshold: 3,
      })
      await tripBreaker(cb, 2)
      await delay(60)
      cb.isOpen() // 轉為 HALF_OPEN
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })

    it('transitions back to OPEN on first failure in HALF_OPEN', async () => {
      try {
        await cb.execute(async () => {
          throw new Error('half-open fail')
        })
      } catch {
        // 預期
      }
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)
    })

    it('calls onOpen callback again on fallback', async () => {
      const openCalls: string[] = []
      const cb2 = new CircuitBreaker('fallback-cb', {
        failureThreshold: 2,
        resetTimeout: 50,
        successThreshold: 3,
        onOpen: (name) => {
          openCalls.push(name ?? '')
        },
      })
      await tripBreaker(cb2, 2)
      // 第一次 onOpen
      expect(openCalls.length).toBe(1)

      await delay(60)
      cb2.isOpen()

      try {
        await cb2.execute(async () => {
          throw new Error('fail again')
        })
      } catch {
        // 預期
      }
      // 第二次 onOpen
      expect(openCalls.length).toBe(2)
    })

    it('allows recovery after second OPEN period', async () => {
      // 第一次失敗 → 回到 OPEN
      try {
        await cb.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // 預期
      }
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)

      // 等待 resetTimeout 再次轉為 HALF_OPEN
      await delay(60)
      cb.isOpen()
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      // 這次成功
      await cb.execute(async () => 'recover1')
      await cb.execute(async () => 'recover2')
      await cb.execute(async () => 'recover3')
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  // -----------------------------------------------------------------------
  // 7. enabled:false 旁路
  // -----------------------------------------------------------------------
  describe('enabled:false bypass', () => {
    let cb: CircuitBreaker

    beforeEach(() => {
      cb = new CircuitBreaker('disabled', {
        enabled: false,
        failureThreshold: 1,
        resetTimeout: 60_000,
      })
    })

    it('executes operation even if it would normally trip', async () => {
      // 如果啟用，1 次失敗就 OPEN；但 disabled 時應該不會
      try {
        await cb.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // 預期拋錯
      }

      // 即使失敗也不會 OPEN（disabled 直接執行不經斷路器）
      const result = await cb.execute(async () => 'still works')
      expect(result).toBe('still works')
    })

    it('does not change state on failures', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('returns operation result directly', async () => {
      const result = await cb.execute(async () => 'bypass-value')
      expect(result).toBe('bypass-value')
    })
  })

  // -----------------------------------------------------------------------
  // 8. 滑動視窗
  // -----------------------------------------------------------------------
  describe('sliding window', () => {
    it('resets failure count after window expires', async () => {
      const cb = new CircuitBreaker('window-test', {
        failureThreshold: 3,
        windowSize: 80,
        resetTimeout: 60_000,
      })

      // 2 次失敗（不到閥值）
      await tripBreaker(cb, 2)
      expect(cb.getFailureCount()).toBe(2)

      // 等待視窗過期
      await delay(100)

      // checkStateTransition 清除 failureCount
      cb.isOpen()
      expect(cb.getFailureCount()).toBe(0)
    })

    it('does not trip if failures are spread across windows', async () => {
      const cb = new CircuitBreaker('spread-test', {
        failureThreshold: 3,
        windowSize: 80,
        resetTimeout: 60_000,
      })

      await tripBreaker(cb, 2)
      await delay(100)
      // 視窗過期後再失敗 1 次，不應累計到 3
      await tripBreaker(cb, 1)

      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('trips if failures are within the same window', async () => {
      const cb = new CircuitBreaker('same-window', {
        failureThreshold: 3,
        windowSize: 5_000,
        resetTimeout: 60_000,
      })

      await tripBreaker(cb, 3)
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)
    })
  })

  // -----------------------------------------------------------------------
  // 9. getMetrics()
  // -----------------------------------------------------------------------
  describe('getMetrics()', () => {
    it('returns initial metrics for a fresh breaker', () => {
      const cb = new CircuitBreaker('metrics-init')
      const m = cb.getMetrics()
      expect(m.state).toBe(CircuitBreakerState.CLOSED)
      expect(m.failures).toBe(0)
      expect(m.successes).toBe(0)
      expect(m.totalRequests).toBe(0)
      expect(m.totalFailures).toBe(0)
      expect(m.totalSuccesses).toBe(0)
      expect(m.lastFailureAt).toBeUndefined()
      expect(m.lastSuccessAt).toBeUndefined()
      expect(m.openedAt).toBeUndefined()
    })

    it('tracks totalRequests, totalFailures, totalSuccesses', async () => {
      const cb = new CircuitBreaker('metrics-totals', {
        failureThreshold: 10,
        resetTimeout: 60_000,
      })
      await cb.execute(async () => 'ok1')
      await cb.execute(async () => 'ok2')
      try {
        await cb.execute(async () => {
          throw new Error('fail')
        })
      } catch {
        // 預期
      }

      const m = cb.getMetrics()
      expect(m.totalRequests).toBe(3)
      expect(m.totalSuccesses).toBe(2)
      expect(m.totalFailures).toBe(1)
    })

    it('records lastFailureAt and openedAt timestamps', async () => {
      const cb = new CircuitBreaker('metrics-ts', {
        failureThreshold: 2,
        resetTimeout: 60_000,
      })
      const before = new Date()
      await tripBreaker(cb, 2)
      const after = new Date()

      const m = cb.getMetrics()
      expect(m.lastFailureAt).toBeDefined()
      expect(m.lastFailureAt?.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(m.lastFailureAt?.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(m.openedAt).toBeDefined()
      expect(m.state).toBe(CircuitBreakerState.OPEN)
    })
  })

  // -----------------------------------------------------------------------
  // 10. reset() 手動重置
  // -----------------------------------------------------------------------
  describe('reset() manual reset', () => {
    it('resets OPEN breaker back to CLOSED', async () => {
      const cb = new CircuitBreaker('reset-test', {
        failureThreshold: 2,
        resetTimeout: 60_000,
      })
      await tripBreaker(cb, 2)
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)

      cb.reset()
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(cb.getFailureCount()).toBe(0)
    })

    it('allows operations after reset', async () => {
      const cb = new CircuitBreaker('reset-ops', {
        failureThreshold: 2,
        resetTimeout: 60_000,
      })
      await tripBreaker(cb, 2)
      cb.reset()

      const result = await cb.execute(async () => 'after-reset')
      expect(result).toBe('after-reset')
    })

    it('manualReset() is an alias for reset()', async () => {
      const cb = new CircuitBreaker('manual-reset', {
        failureThreshold: 2,
        resetTimeout: 60_000,
      })
      await tripBreaker(cb, 2)
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)

      cb.manualReset()
      expect(cb.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(cb.getFailureCount()).toBe(0)
    })
  })
})
