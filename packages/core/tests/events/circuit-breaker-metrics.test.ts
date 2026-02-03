/**
 * @gravito/core - Circuit Breaker Metrics Integration Tests
 *
 * Tests for circuit breaker integration with OpenTelemetry metrics.
 * This completes Task 1.2.2.5 - Complete Test Suite.
 */

import { describe, expect, it, mock } from 'bun:test'
import { CircuitBreaker } from '../../src/events/CircuitBreaker'
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
        } catch {
          // Expected
        }
      }

      expect(totalFailures).toBe(3)
      expect(totalTransitions).toBeGreaterThan(0)

      // Generate success activity
      for (let i = 0; i < 2; i++) {
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
        recordTransition: mock((eventName: string, from: string, to: string) => {
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
})
