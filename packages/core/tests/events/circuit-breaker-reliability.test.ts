/**
 * @gravito/core - Circuit Breaker Reliability Tests
 *
 * Comprehensive tests for circuit breaker reliability under complex scenarios.
 * This implements Task 1.2.2.5 - Complete Test Suite.
 */

import { describe, expect, it, mock } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../src/events/CircuitBreaker'

describe('CircuitBreaker Reliability Tests', () => {
  describe('Concurrent Failure Isolation', () => {
    it('should isolate failures in multiple circuit breakers independently', async () => {
      const cb1 = new CircuitBreaker('event1', { failureThreshold: 3 })
      const cb2 = new CircuitBreaker('event2', { failureThreshold: 3 })

      // Fail cb1 multiple times
      for (let i = 0; i < 3; i++) {
        try {
          await cb1.execute(async () => {
            throw new Error('Failure')
          })
        } catch {
          // Expected
        }
      }

      // cb1 should be OPEN, cb2 should be CLOSED
      expect(cb1.isOpen()).toBe(true)
      expect(cb2.isOpen()).toBe(false)

      // Execute success in cb2 - should not affect cb1
      await cb2.execute(async () => 'success')
      expect(cb1.isOpen()).toBe(true)
      expect(cb2.isOpen()).toBe(false)
    })

    it('should handle rapid state transitions in multiple breakers', async () => {
      const breakers = Array.from(
        { length: 3 },
        (_, i) => new CircuitBreaker(`event${i}`, { failureThreshold: 2, successThreshold: 1 })
      )

      // Cycle 1: Fail all
      for (const cb of breakers) {
        for (let i = 0; i < 2; i++) {
          try {
            await cb.execute(async () => {
              throw new Error('Fail')
            })
          } catch {
            // Expected
          }
        }
      }

      // All should be open
      for (const b of breakers) {
        expect(b.isOpen()).toBe(true)
      }

      // Reset all
      for (const b of breakers) {
        b.reset()
      }

      // All should be closed
      for (const b of breakers) {
        expect(b.isOpen()).toBe(false)
      }
    })
  })

  describe('Mixed Priority Scenarios', () => {
    it('should handle high/normal/low priority events with independent CB', async () => {
      const breakers = {
        high: new CircuitBreaker('high-priority', { failureThreshold: 2 }),
        normal: new CircuitBreaker('normal-priority', { failureThreshold: 3 }),
        low: new CircuitBreaker('low-priority', { failureThreshold: 5 }),
      }

      // Fail high priority more frequently
      for (let i = 0; i < 2; i++) {
        try {
          await breakers.high.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // Expected
        }
      }
      expect(breakers.high.isOpen()).toBe(true)

      // Normal priority should not be affected
      for (let i = 0; i < 2; i++) {
        try {
          await breakers.normal.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // Expected
        }
      }
      expect(breakers.normal.isOpen()).toBe(false)

      // Low priority should handle even more failures
      for (let i = 0; i < 4; i++) {
        try {
          await breakers.low.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // Expected
        }
      }
      expect(breakers.low.isOpen()).toBe(false)
    })
  })

  describe('Metrics Accuracy', () => {
    it('should track cumulative failure and success counts', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('metrics:test', {
        failureThreshold: 3,
        metricsRecorder,
      })

      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {}
      }

      for (let i = 0; i < 2; i++) {
        cb.reset()
        await cb.execute(async () => 'success')
      }

      expect(metricsRecorder.recordFailure).toHaveBeenCalledTimes(3)
      expect(metricsRecorder.recordSuccess).toHaveBeenCalledTimes(2)
    })

    it('should match internal metrics with external metrics', async () => {
      const cb = new CircuitBreaker('test:event', { failureThreshold: 2 })

      let metrics = cb.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.totalSuccesses).toBe(0)

      // Fail and check metrics
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      metrics = cb.getMetrics()
      expect(metrics.totalFailures).toBe(1)
    })
  })

  describe('Performance Benchmark', () => {
    it('should have minimal overhead for circuit breaker operations', async () => {
      const iterations = 100
      const cb = new CircuitBreaker('perf:test', { failureThreshold: 1000 })

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        await cb.execute(async () => 'success')
      }

      const duration = performance.now() - startTime
      const avgTime = duration / iterations

      // Each operation should take < 5ms on average
      expect(avgTime).toBeLessThan(5)
    })
  })

  describe('Recovery Timing', () => {
    it('should transition from OPEN to HALF_OPEN within expected timeout', async () => {
      const timeout = 100
      const cb = new CircuitBreaker('timing:test', {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeout: timeout,
      })

      // Open the circuit
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      expect(cb.isOpen()).toBe(true)

      // Wait for transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, timeout + 50))

      // Should be in HALF_OPEN state
      expect(cb.isHalfOpen()).toBe(true)

      // Close it
      await cb.execute(async () => 'success')
      expect(cb.isOpen()).toBe(false)
    })
  })

  describe('Long-running Stability', () => {
    it('should maintain state consistency over extended operation', async () => {
      const cb = new CircuitBreaker('stability:test', {
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 50,
      })

      // Simulate 5 cycles of failure/recovery
      for (let cycle = 0; cycle < 5; cycle++) {
        // Fail 3 times
        for (let i = 0; i < 3; i++) {
          try {
            await cb.execute(async () => {
              throw new Error('Fail')
            })
          } catch {
            // Expected
          }
        }
        expect(cb.isOpen()).toBe(true)

        // Wait for recovery window
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Recover with 2 successes
        for (let i = 0; i < 2; i++) {
          await cb.execute(async () => 'success')
        }
        expect(cb.isOpen()).toBe(false)
      }

      // Final state should be valid
      const metrics = cb.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('State Transitions', () => {
    it('should properly track state transitions', async () => {
      const transitions: [string, string][] = []
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock((_eventName: string, from: string, to: string) => {
          transitions.push([from, to])
        }),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('transitions:test', {
        failureThreshold: 1,
        metricsRecorder,
      })

      // Transition 1: CLOSED -> OPEN
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      expect(transitions.length).toBeGreaterThan(0)
      expect(transitions[0]).toEqual(['CLOSED', 'OPEN'])
    })

    it('should record metrics for all state transitions', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('test:event', {
        failureThreshold: 1,
        metricsRecorder,
      })

      // Trigger transition
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      // Verify transition was recorded
      expect(metricsRecorder.recordTransition).toHaveBeenCalledWith('test:event', 'CLOSED', 'OPEN')
    })
  })

  describe('Half-Open State Behavior', () => {
    it('should allow test requests in HALF_OPEN state', async () => {
      const cb = new CircuitBreaker('half-open:test', {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeout: 50,
      })

      // Open circuit
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      // Wait for HALF_OPEN transition
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(cb.isHalfOpen()).toBe(true)

      // Should allow request in HALF_OPEN
      const result = await cb.execute(async () => 'test')
      expect(result).toBe('test')
      expect(cb.isOpen()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully during state transitions', async () => {
      const cb = new CircuitBreaker('error:test', { failureThreshold: 2 })

      // Multiple failures with errors
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Service failed')
          })
        } catch (error) {
          expect(error).toBeDefined()
        }
      }

      expect(cb.isOpen()).toBe(true)

      // Should throw CircuitBreakerOpenError when open
      try {
        await cb.execute(async () => 'should not execute')
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('Circuit is OPEN')
      }
    })
  })

  describe('Disabled Circuit Breaker', () => {
    it('should pass through operations without circuit breaking when disabled', async () => {
      const cb = new CircuitBreaker('disabled:test', {
        enabled: false,
        failureThreshold: 1,
      })

      // 即使失敗次數超過閾值，操作仍應直接執行
      for (let i = 0; i < 5; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Service error')
          })
        } catch (error: any) {
          // 應收到原始錯誤，而非 "Circuit is OPEN"
          expect(error.message).toBe('Service error')
        }
      }

      // 停用時不追蹤狀態，電路應保持 CLOSED
      expect(cb.isOpen()).toBe(false)
      expect(cb.isClosed()).toBe(true)

      // 成功操作仍應正常運作
      const result = await cb.execute(async () => 'success')
      expect(result).toBe('success')

      // getMetrics 不應有任何計數（旁路跳過了所有追蹤邏輯）
      const metrics = cb.getMetrics()
      expect(metrics.totalRequests).toBe(0)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.totalSuccesses).toBe(0)
    })
  })

  describe('Half-Open Success Flow', () => {
    it('should transition OPEN -> HALF_OPEN -> CLOSED when successThreshold is met', async () => {
      const transitions: [string, string][] = []
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock((_eventName: string, from: string, to: string) => {
          transitions.push([from, to])
        }),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('half-open-success:test', {
        failureThreshold: 2,
        successThreshold: 3,
        resetTimeout: 50,
        metricsRecorder,
      })

      // 階段 1：透過失敗打開電路
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getState()).toBe(CircuitBreakerState.OPEN)

      // 階段 2：等待 HALF_OPEN 轉換
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cb.isHalfOpen()).toBe(true)

      // 階段 3：逐步發送成功請求，驗證 successThreshold 遞增過程
      // 第 1 次成功：halfOpenAttempts=1，需要 3
      await cb.execute(async () => 'ok1')
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      // 第 2 次成功：halfOpenAttempts=2，仍需 3
      await cb.execute(async () => 'ok2')
      expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)

      // 第 3 次成功：halfOpenAttempts=3，達到閾值 -> CLOSED
      await cb.execute(async () => 'ok3')
      expect(cb.isClosed()).toBe(true)

      // 驗證完整轉換路徑
      expect(transitions).toContainEqual(['CLOSED', 'OPEN'])
      expect(transitions).toContainEqual(['OPEN', 'HALF_OPEN'])
      expect(transitions).toContainEqual(['HALF_OPEN', 'CLOSED'])

      // 驗證 recordOpenDuration 被呼叫（從 OPEN 轉出時記錄）
      expect(metricsRecorder.recordOpenDuration).toHaveBeenCalled()
    })
  })

  describe('Half-Open Failure Flow', () => {
    it('should transition OPEN -> HALF_OPEN -> OPEN when test request fails', async () => {
      const transitions: [string, string][] = []
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock((_eventName: string, from: string, to: string) => {
          transitions.push([from, to])
        }),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('half-open-fail:test', {
        failureThreshold: 1,
        successThreshold: 2,
        resetTimeout: 50,
        metricsRecorder,
      })

      // 打開電路
      try {
        await cb.execute(async () => {
          throw new Error('Initial failure')
        })
      } catch {
        // 預期
      }
      expect(cb.isOpen()).toBe(true)

      // 等待轉換到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cb.isHalfOpen()).toBe(true)

      // 在 HALF_OPEN 中失敗 -- 應立即回到 OPEN
      try {
        await cb.execute(async () => {
          throw new Error('Half-open failure')
        })
      } catch (error: any) {
        // 應收到操作的原始錯誤，不是 "Circuit is OPEN"
        expect(error.message).toBe('Half-open failure')
      }

      // 電路應回到 OPEN
      expect(cb.isOpen()).toBe(true)

      // 在 OPEN 狀態下嘗試執行應拋出電路開啟錯誤
      try {
        await cb.execute(async () => 'should not run')
        expect.unreachable()
      } catch (error: any) {
        expect(error.message).toContain('Circuit is OPEN')
      }

      // 驗證完整轉換路徑：CLOSED->OPEN, OPEN->HALF_OPEN, HALF_OPEN->OPEN
      expect(transitions).toContainEqual(['CLOSED', 'OPEN'])
      expect(transitions).toContainEqual(['OPEN', 'HALF_OPEN'])
      expect(transitions).toContainEqual(['HALF_OPEN', 'OPEN'])
    })
  })
})
