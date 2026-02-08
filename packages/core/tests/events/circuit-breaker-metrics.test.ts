/**
 * @gravito/core - Circuit Breaker Metrics Integration Tests
 *
 * Tests for circuit breaker integration with OpenTelemetry metrics.
 * This completes Task 1.2.2.5 - Complete Test Suite.
 */

import { describe, expect, it, mock } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../src/events/CircuitBreaker'
import { OTelEventMetrics } from '../../src/events/observability/OTelEventMetrics'

describe('CircuitBreaker Metrics Integration', () => {
  describe('OTelEventMetrics CircuitBreaker Methods', () => {
    it('should have circuit breaker metrics recording methods', () => {
      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)

      // Should have these methods
      expect(typeof metrics.recordCircuitBreakerFailure).toBe('function')
      expect(typeof metrics.recordCircuitBreakerSuccess).toBe('function')
      expect(typeof metrics.recordCircuitBreakerTransition).toBe('function')
      expect(typeof metrics.recordCircuitBreakerOpenDuration).toBe('function')
    })

    it('should manage circuit breaker state callbacks', () => {
      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)

      const callback = () => ({
        eventName: 'test:event',
        listenerIndex: 0,
        state: 0 as const,
      })

      // Register callback
      metrics.registerCircuitBreakerStateCallback('test:event-0', callback)
      let registered = metrics.getRegisteredCircuitBreakers()
      expect(registered).toContain('test:event-0')

      // Unregister callback
      metrics.unregisterCircuitBreakerStateCallback('test:event-0')
      registered = metrics.getRegisteredCircuitBreakers()
      expect(registered).not.toContain('test:event-0')
    })

    it('should provide correct histogram buckets for open duration', () => {
      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)
      const buckets = metrics.getCircuitBreakerOpenDurationBuckets()

      // Should have multiple buckets
      expect(buckets.length).toBeGreaterThan(5)

      // Buckets should be in ascending order
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i]).toBeGreaterThan(buckets[i - 1])
      }
    })

    it('should clear all circuit breaker callbacks', () => {
      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)

      // Register multiple callbacks
      metrics.registerCircuitBreakerStateCallback('cb1', () => ({
        eventName: 'e1',
        listenerIndex: 0,
        state: 0,
      }))
      metrics.registerCircuitBreakerStateCallback('cb2', () => ({
        eventName: 'e2',
        listenerIndex: 1,
        state: 1,
      }))

      let registered = metrics.getRegisteredCircuitBreakers()
      expect(registered.length).toBe(2)

      // Clear all
      metrics.clearCircuitBreakerCallbacks()
      registered = metrics.getRegisteredCircuitBreakers()
      expect(registered.length).toBe(0)
    })
  })

  describe('Circuit Breaker with Metrics Recorder', () => {
    it('should integrate CircuitBreaker with metrics recording', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('test:event', {
        failureThreshold: 2,
        metricsRecorder,
      })

      // Fail and verify metrics are recorded
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      expect(metricsRecorder.recordFailure).toHaveBeenCalledWith('test:event')
    })

    it('should record state transitions with correct state numbers', async () => {
      const transitions: Array<{ event: string; state: number }> = []

      const metricsRecorder = {
        recordState: mock((eventName: string, state: number) => {
          transitions.push({ event: eventName, state })
        }),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('test:event', {
        failureThreshold: 1,
        metricsRecorder,
      })

      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      // Should record OPEN state as 2
      expect(transitions.some((t) => t.state === 2)).toBe(true)
    })

    it('should record success metrics', async () => {
      const successCalls: string[] = []

      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock((eventName: string) => {
          successCalls.push(eventName)
        }),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('success:test', {
        failureThreshold: 5,
        metricsRecorder,
      })

      // Record success
      await cb.execute(async () => 'success')

      // Success should be recorded
      expect(successCalls).toContain('success:test')
    })
  })

  describe('Multi-Listener Metrics Tracking', () => {
    it('should track metrics for each listener independently', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      // Simulate 2 listeners for the same event
      const listeners = Array.from(
        { length: 2 },
        (_, i) =>
          new CircuitBreaker(`order:created-listener-${i}`, {
            failureThreshold: 1,
            metricsRecorder,
          })
      )

      // Fail only the first listener
      try {
        await listeners[0].execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // Expected
      }

      // First should be open
      expect(listeners[0].isOpen()).toBe(true)
      // Second should be closed
      expect(listeners[1].isOpen()).toBe(false)

      // Verify transition was recorded with correct listener name
      expect(metricsRecorder.recordTransition).toHaveBeenCalledWith(
        'order:created-listener-0',
        'CLOSED',
        'OPEN'
      )
    })
  })

  describe('Metrics Export Compatibility', () => {
    it('should provide metrics compatible with Prometheus', () => {
      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)

      // Verify metric naming follows Prometheus convention
      const prefix = metrics.getPrefix()
      expect(prefix).toMatch(/^gravito_event_/)

      // Should be lowercase with underscores
      expect(prefix).toMatch(/^[a-z_]+_$/)
    })
  })

  describe('Cumulative Metrics Tracking', () => {
    it('should accumulate metrics across multiple operations', async () => {
      let totalFailures = 0
      let totalSuccesses = 0
      let totalTransitions = 0

      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {
          totalTransitions++
        }),
        recordFailure: mock(() => {
          totalFailures++
        }),
        recordSuccess: mock(() => {
          totalSuccesses++
        }),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('accumulate:test', {
        failureThreshold: 3,
        metricsRecorder,
      })

      // Generate failures
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {}
      }

      expect(totalFailures).toBe(3)
      expect(totalTransitions).toBeGreaterThan(0)

      // Generate success activity
      for (let i = 0; i < 2; i++) {
        cb.reset()
        await cb.execute(async () => 'success')
      }

      expect(totalSuccesses).toBe(2)
    })
  })

  describe('Observable Gauge Callback Registration', () => {
    it('should support circuit breaker state observables', () => {
      let capturedCallback: ((observer: any) => void) | null = null

      const mockMeter = {
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({
          addCallback: mock((cb: (observer: any) => void) => {
            capturedCallback = cb
          }),
        }),
        createCounter: () => ({ add: mock(() => {}) }),
      }

      const metrics = new OTelEventMetrics(mockMeter as any)

      // Register a state callback
      metrics.registerCircuitBreakerStateCallback('test:cb', () => ({
        eventName: 'order:created',
        listenerIndex: 0,
        state: 2, // OPEN
      }))

      // Callback should be registered
      expect(capturedCallback).toBeDefined()

      // Verify structure would be correct
      expect(typeof capturedCallback).toBe('function')
    })
  })

  describe('Full Integration Scenario', () => {
    it('should track complete circuit breaker lifecycle', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _metrics = new OTelEventMetrics({
        createHistogram: () => ({ record: mock(() => {}) }),
        createObservableGauge: () => ({ addCallback: mock(() => {}) }),
        createCounter: () => ({ add: mock(() => {}) }),
      } as any)

      const failureLog: string[] = []
      const successLog: string[] = []
      const transitionLog: [string, string][] = []

      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock((_eventName: string, from: string, to: string) => {
          transitionLog.push([from, to])
        }),
        recordFailure: mock((eventName: string) => {
          failureLog.push(eventName)
        }),
        recordSuccess: mock((eventName: string) => {
          successLog.push(eventName)
        }),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('order:created', {
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeout: 50,
        metricsRecorder,
      })

      // Phase 1: Failures
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Service failed')
          })
        } catch {
          // Expected
        }
      }

      expect(failureLog).toContain('order:created')
      expect(failureLog.length).toBe(2)

      // Phase 2: Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Phase 3: Recover
      await cb.execute(async () => 'success')

      expect(successLog).toContain('order:created')
      expect(cb.isOpen()).toBe(false)
      expect(transitionLog.length).toBeGreaterThan(0)
    })
  })

  describe('Sliding Window Expiration', () => {
    it('should not count expired failures outside the window', async () => {
      const cb = new CircuitBreaker('window-expire:test', {
        failureThreshold: 3,
        windowSize: 100,
      })

      // 記錄 2 次失敗（低於閾值）
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getFailureCount()).toBe(2)
      expect(cb.isClosed()).toBe(true)

      // 等待滑動窗口過期
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 窗口過期後，下一次執行時舊失敗應被重置
      try {
        await cb.execute(async () => {
          throw new Error('New failure')
        })
      } catch {
        // 預期
      }

      // 舊失敗已過期，只剩這次新失敗
      expect(cb.getFailureCount()).toBe(1)
      expect(cb.isClosed()).toBe(true)

      // 再累積 1 次（總共 2 次新失敗，仍低於閾值 3）
      try {
        await cb.execute(async () => {
          throw new Error('Another failure')
        })
      } catch {
        // 預期
      }
      expect(cb.getFailureCount()).toBe(2)
      expect(cb.isClosed()).toBe(true)
    })
  })

  describe('Success Threshold Verification', () => {
    it('should require exact successThreshold successes in HALF_OPEN to close', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('threshold:test', {
        failureThreshold: 1,
        successThreshold: 4,
        resetTimeout: 50,
        metricsRecorder,
      })

      // 打開電路
      try {
        await cb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // 預期
      }
      expect(cb.isOpen()).toBe(true)

      // 等待 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cb.isHalfOpen()).toBe(true)

      // 逐步驗證：每次成功後確認仍在 HALF_OPEN（直到達到閾值）
      for (let i = 1; i <= 3; i++) {
        await cb.execute(async () => `success-${i}`)
        // 前 3 次成功不應關閉電路（需要 4 次）
        expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN)
      }

      // 第 4 次成功：達到 successThreshold -> 轉為 CLOSED
      await cb.execute(async () => 'final-success')
      expect(cb.isClosed()).toBe(true)

      // 驗證成功計數：4 次 HALF_OPEN 成功 + 指標記錄
      expect(metricsRecorder.recordSuccess).toHaveBeenCalledTimes(4)
      expect(metricsRecorder.recordTransition).toHaveBeenCalledWith(
        'threshold:test',
        'HALF_OPEN',
        'CLOSED'
      )
    })
  })

  describe('Concurrent Execute Calls', () => {
    it('should handle multiple simultaneous execute() calls correctly', async () => {
      const metricsRecorder = {
        recordState: mock(() => {}),
        recordTransition: mock(() => {}),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
        recordOpenDuration: mock(() => {}),
      }

      const cb = new CircuitBreaker('concurrent:test', {
        failureThreshold: 100,
        metricsRecorder,
      })

      // 同時發送 20 個成功操作
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) => cb.execute(async () => `result-${i}`))
      )

      expect(results).toHaveLength(20)
      for (let i = 0; i < 20; i++) {
        expect(results[i]).toBe(`result-${i}`)
      }

      const metrics = cb.getMetrics()
      expect(metrics.totalRequests).toBe(20)
      expect(metrics.totalSuccesses).toBe(20)
      expect(metrics.totalFailures).toBe(0)
      expect(metricsRecorder.recordSuccess).toHaveBeenCalledTimes(20)
    })
  })

  describe('Failure Window Reset', () => {
    it('should reset failure count when sliding window expires and allow fresh accumulation', async () => {
      const cb = new CircuitBreaker('window-reset:test', {
        failureThreshold: 5,
        windowSize: 80,
      })

      // 累積 4 次失敗（距閾值差 1 次）
      for (let i = 0; i < 4; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getFailureCount()).toBe(4)
      expect(cb.isClosed()).toBe(true)

      // 等待滑動窗口過期
      await new Promise((resolve) => setTimeout(resolve, 120))

      // checkStateTransition() 應重置失敗計數
      expect(cb.isClosed()).toBe(true)
      expect(cb.getFailureCount()).toBe(0)

      // 窗口重置後，從 0 重新累積
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('New fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getFailureCount()).toBe(3)
      expect(cb.isClosed()).toBe(true)

      // 再累積 2 次達到閾值（3 + 2 = 5）
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('More fail')
          })
        } catch {
          // 預期
        }
      }
      expect(cb.getFailureCount()).toBe(5)
      expect(cb.isOpen()).toBe(true)
    })
  })

  describe('Custom Reset Timeout', () => {
    it('should respect custom resetTimeout boundaries for OPEN -> HALF_OPEN transition', async () => {
      // 測試短超時（30ms）
      const shortCb = new CircuitBreaker('short-timeout:test', {
        failureThreshold: 1,
        resetTimeout: 30,
      })

      try {
        await shortCb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // 預期
      }
      expect(shortCb.isOpen()).toBe(true)

      // 超時前：應仍為 OPEN
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(shortCb.isOpen()).toBe(true)
      expect(shortCb.isHalfOpen()).toBe(false)

      // 超時後：應轉為 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(shortCb.isHalfOpen()).toBe(true)

      // 測試較長超時（200ms）
      const longCb = new CircuitBreaker('long-timeout:test', {
        failureThreshold: 1,
        resetTimeout: 200,
      })

      try {
        await longCb.execute(async () => {
          throw new Error('Fail')
        })
      } catch {
        // 預期
      }
      expect(longCb.isOpen()).toBe(true)

      // 在 100ms 時：仍應為 OPEN（未達 200ms 超時）
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(longCb.isOpen()).toBe(true)
      expect(longCb.isHalfOpen()).toBe(false)

      // 在 250ms 時：應已轉為 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(longCb.isHalfOpen()).toBe(true)
    })
  })

  describe('Complete Metrics Verification', () => {
    it('should provide comprehensive and accurate metrics through getMetrics()', async () => {
      const cb = new CircuitBreaker('complete-metrics:test', {
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeout: 50,
      })

      // === 初始狀態：所有欄位為預設值 ===
      let metrics = cb.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.failures).toBe(0)
      expect(metrics.successes).toBe(0)
      expect(metrics.totalRequests).toBe(0)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.totalSuccesses).toBe(0)
      expect(metrics.lastFailureAt).toBeUndefined()
      expect(metrics.lastSuccessAt).toBeUndefined()
      expect(metrics.openedAt).toBeUndefined()

      // === 成功操作後 ===
      const beforeSuccess = new Date()
      await cb.execute(async () => 'ok')
      metrics = cb.getMetrics()

      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.successes).toBe(1)
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.totalSuccesses).toBe(1)
      expect(metrics.totalFailures).toBe(0)
      expect(metrics.lastSuccessAt).toBeInstanceOf(Date)
      expect(metrics.lastSuccessAt?.getTime()).toBeGreaterThanOrEqual(beforeSuccess.getTime())
      expect(metrics.failures).toBe(0)

      // === 失敗導致 OPEN ===
      const beforeFailure = new Date()
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期
        }
      }
      metrics = cb.getMetrics()

      expect(metrics.state).toBe(CircuitBreakerState.OPEN)
      expect(metrics.totalRequests).toBe(3)
      expect(metrics.totalFailures).toBe(2)
      expect(metrics.totalSuccesses).toBe(1)
      expect(metrics.lastFailureAt).toBeInstanceOf(Date)
      expect(metrics.lastFailureAt?.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime())
      expect(metrics.openedAt).toBeInstanceOf(Date)
      expect(metrics.openedAt?.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime())

      // === HALF_OPEN 恢復後 ===
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cb.isHalfOpen()).toBe(true)

      await cb.execute(async () => 'recovered')
      metrics = cb.getMetrics()

      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.totalRequests).toBe(4)
      expect(metrics.totalSuccesses).toBe(2)
      expect(metrics.totalFailures).toBe(2)
      expect(metrics.failures).toBe(0)
      expect(metrics.successes).toBe(0)
      expect(metrics.openedAt).toBeUndefined()
    })
  })
})
