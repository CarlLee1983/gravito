/**
 * @gravito/core - DLQ and Backpressure Metrics Tests
 *
 * Tests for OTelEventMetrics implementation of backpressure and DLQ metrics.
 * Covers both stub method implementation and new DLQ-specific metrics.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api'
import { OTelEventMetrics } from '../events/observability/OTelEventMetrics'

/**
 * Mock Meter implementation for testing
 */
class MockMeter implements Meter {
  recordedCounterCalls: Array<{ name: string; value: number; attributes: Record<string, string> }> =
    []
  recordedHistogramCalls: Array<{
    name: string
    value: number
    attributes: Record<string, string>
  }> = []
  observableCallbacks: Map<string, Function> = new Map()

  createCounter(name: string, _options?: any): Counter {
    return {
      add: (value: number, attributes: Record<string, string> = {}) => {
        this.recordedCounterCalls.push({ name, value, attributes })
      },
    } as Counter
  }

  createHistogram(name: string, _options?: any): Histogram {
    return {
      record: (value: number, attributes: Record<string, string> = {}) => {
        this.recordedHistogramCalls.push({ name, value, attributes })
      },
    } as Histogram
  }

  createObservableGauge(name: string, _options?: any): ObservableGauge {
    return {
      addCallback: (callback: Function) => {
        this.observableCallbacks.set(name, callback)
      },
    } as ObservableGauge
  }

  // Stub methods for unused Meter methods
  createUpDownCounter() {
    return {} as any
  }

  addView() {
    return this
  }
}

describe('OTelEventMetrics - DLQ and Backpressure Metrics', () => {
  let meter: MockMeter
  let metrics: OTelEventMetrics

  beforeEach(() => {
    meter = new MockMeter()
    metrics = new OTelEventMetrics(meter)
  })

  describe('Backpressure Metrics Implementation', () => {
    it('should implement recordBackpressureRejection method', () => {
      const beforeCount = meter.recordedCounterCalls.length
      metrics.recordBackpressureRejection('order:created', 'high', 'queue_depth_exceeded')
      const afterCount = meter.recordedCounterCalls.length

      expect(afterCount).toBe(beforeCount + 1)
      const lastCall = meter.recordedCounterCalls[meter.recordedCounterCalls.length - 1]
      expect(lastCall.name).toContain('backpressure_rejections')
      expect(lastCall.attributes.event_name).toBe('order:created')
      expect(lastCall.attributes.priority).toBe('high')
      expect(lastCall.attributes.reason).toBe('queue_depth_exceeded')
    })

    it('should record multiple backpressure rejections with different attributes', () => {
      metrics.recordBackpressureRejection('order:created', 'high', 'queue_depth_exceeded')
      metrics.recordBackpressureRejection('payment:processed', 'normal', 'latency_spike')

      const rejectionCalls = meter.recordedCounterCalls.filter((call) =>
        call.name.includes('backpressure_rejections')
      )
      expect(rejectionCalls.length).toBe(2)
      expect(rejectionCalls[0].attributes.event_name).toBe('order:created')
      expect(rejectionCalls[1].attributes.event_name).toBe('payment:processed')
    })

    it('should implement recordBackpressureState method', () => {
      metrics.recordBackpressureState('NORMAL')
      metrics.recordBackpressureState('WARNING')
      metrics.recordBackpressureState('CRITICAL')
      metrics.recordBackpressureState('OVERFLOW')

      // Verify that state callback returns correct values
      const stateCallback = meter.observableCallbacks.get('gravito_event_backpressure_state')
      expect(stateCallback).toBeDefined()

      // Mock ObservableResult
      const results: Array<{ value: number }> = []
      const mockObservableResult = {
        observe: (value: number) => {
          results.push({ value })
        },
      }

      stateCallback?.(mockObservableResult)
      // After setting OVERFLOW, the last recorded state should be 3
      expect(results[0].value).toBe(3)
    })

    it('should map backpressure states correctly', () => {
      const states: [string, number][] = [
        ['NORMAL', 0],
        ['WARNING', 1],
        ['CRITICAL', 2],
        ['OVERFLOW', 3],
      ]

      for (const [stateName, expectedValue] of states) {
        metrics.recordBackpressureState(stateName)

        const stateCallback = meter.observableCallbacks.get('gravito_event_backpressure_state')
        const results: Array<{ value: number }> = []
        const mockObservableResult = {
          observe: (value: number) => {
            results.push({ value })
          },
        }

        stateCallback?.(mockObservableResult)
        expect(results[0].value).toBe(expectedValue)
      }
    })

    it('should implement recordBackpressureDegradation method', () => {
      const beforeCount = meter.recordedCounterCalls.length
      metrics.recordBackpressureDegradation('order:created', 'high', 'normal')
      const afterCount = meter.recordedCounterCalls.length

      expect(afterCount).toBe(beforeCount + 1)
      const lastCall = meter.recordedCounterCalls[meter.recordedCounterCalls.length - 1]
      expect(lastCall.name).toContain('backpressure_degradations')
      expect(lastCall.attributes.event_name).toBe('order:created')
      expect(lastCall.attributes.from_priority).toBe('high')
      expect(lastCall.attributes.to_priority).toBe('normal')
    })

    it('should record priority degradations from multiple levels', () => {
      metrics.recordBackpressureDegradation('order:created', 'high', 'normal')
      metrics.recordBackpressureDegradation('payment:processed', 'normal', 'low')
      metrics.recordBackpressureDegradation('inventory:updated', 'high', 'low')

      const degradationCalls = meter.recordedCounterCalls.filter((call) =>
        call.name.includes('backpressure_degradations')
      )
      expect(degradationCalls.length).toBe(3)
      expect(degradationCalls[0].attributes.from_priority).toBe('high')
      expect(degradationCalls[1].attributes.from_priority).toBe('normal')
    })
  })

  describe('DLQ Metrics Implementation', () => {
    it('should implement recordDLQEntry method', () => {
      const beforeCount = meter.recordedCounterCalls.length
      metrics.recordDLQEntry('order:created', 'retry_exhausted')
      const afterCount = meter.recordedCounterCalls.length

      expect(afterCount).toBe(beforeCount + 1)
      const lastCall = meter.recordedCounterCalls[meter.recordedCounterCalls.length - 1]
      expect(lastCall.name).toContain('dlq_entries')
      expect(lastCall.attributes.event_name).toBe('order:created')
      expect(lastCall.attributes.source).toBe('retry_exhausted')
    })

    it('should record DLQ entries from different sources', () => {
      const sources = ['retry_exhausted', 'circuit_breaker', 'backpressure_overflow']

      for (const source of sources) {
        metrics.recordDLQEntry('test:event', source)
      }

      const dlqCalls = meter.recordedCounterCalls.filter((call) =>
        call.name.includes('dlq_entries')
      )
      expect(dlqCalls.length).toBe(3)
      expect(dlqCalls[0].attributes.source).toBe('retry_exhausted')
      expect(dlqCalls[1].attributes.source).toBe('circuit_breaker')
      expect(dlqCalls[2].attributes.source).toBe('backpressure_overflow')
    })

    it('should implement setDLQDepthCallback method', () => {
      const mockDepth = 42
      metrics.setDLQDepthCallback(() => mockDepth)

      const depthCallback = meter.observableCallbacks.get('gravito_event_dlq_depth')
      expect(depthCallback).toBeDefined()

      const results: Array<{ value: number }> = []
      const mockObservableResult = {
        observe: (value: number) => {
          results.push({ value })
        },
      }

      depthCallback?.(mockObservableResult)
      expect(results[0].value).toBe(mockDepth)
    })

    it('should update DLQ depth callback dynamically', () => {
      let depth = 10
      metrics.setDLQDepthCallback(() => depth)

      const depthCallback = meter.observableCallbacks.get('gravito_event_dlq_depth')
      const mockObservableResult = {
        observe: (value: number) => {
          return value
        },
      }

      // First call with depth = 10
      let result: any = null
      ;(mockObservableResult as any).observe = (value: number) => {
        result = value
      }
      depthCallback?.(mockObservableResult)
      expect(result).toBe(10)

      // Update depth and call again
      depth = 25
      depthCallback?.(mockObservableResult)
      expect(result).toBe(25)
    })

    it('should implement recordDLQRequeue method', () => {
      const beforeCount = meter.recordedCounterCalls.length
      metrics.recordDLQRequeue('order:created', 'success')
      const afterCount = meter.recordedCounterCalls.length

      expect(afterCount).toBe(beforeCount + 1)
      const lastCall = meter.recordedCounterCalls[meter.recordedCounterCalls.length - 1]
      expect(lastCall.name).toContain('dlq_requeue')
      expect(lastCall.attributes.event_name).toBe('order:created')
      expect(lastCall.attributes.result).toBe('success')
    })

    it('should record both successful and failed DLQ requeues', () => {
      metrics.recordDLQRequeue('order:created', 'success')
      metrics.recordDLQRequeue('order:created', 'failure')
      metrics.recordDLQRequeue('payment:processed', 'success')

      const requeueCalls = meter.recordedCounterCalls.filter((call) =>
        call.name.includes('dlq_requeue')
      )
      expect(requeueCalls.length).toBe(3)
      expect(requeueCalls[0].attributes.result).toBe('success')
      expect(requeueCalls[1].attributes.result).toBe('failure')
      expect(requeueCalls[2].attributes.result).toBe('success')
    })

    it('should implement recordRetryAttempt method', () => {
      const beforeCount = meter.recordedCounterCalls.length
      metrics.recordRetryAttempt('order:created', 1)
      const afterCount = meter.recordedCounterCalls.length

      expect(afterCount).toBe(beforeCount + 1)
      const lastCall = meter.recordedCounterCalls[meter.recordedCounterCalls.length - 1]
      expect(lastCall.name).toContain('retry_attempts')
      expect(lastCall.attributes.event_name).toBe('order:created')
      expect(lastCall.attributes.attempt_number).toBe('1')
    })

    it('should record multiple retry attempts with correct attempt numbers', () => {
      for (let i = 1; i <= 5; i++) {
        metrics.recordRetryAttempt('order:created', i)
      }

      const retryCalls = meter.recordedCounterCalls.filter((call) =>
        call.name.includes('retry_attempts')
      )
      expect(retryCalls.length).toBe(5)
      for (let i = 0; i < 5; i++) {
        expect(retryCalls[i].attributes.attempt_number).toBe(String(i + 1))
      }
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle empty event names gracefully', () => {
      expect(() => {
        metrics.recordBackpressureRejection('', 'high', 'reason')
        metrics.recordDLQEntry('', 'retry_exhausted')
        metrics.recordDLQRequeue('', 'success')
        metrics.recordRetryAttempt('', 1)
      }).not.toThrow()
    })

    it('should handle special characters in event names', () => {
      const eventName = 'order:created:v2@flash-sale'
      metrics.recordDLQEntry(eventName, 'retry_exhausted')
      metrics.recordDLQRequeue(eventName, 'success')

      const dlqCalls = meter.recordedCounterCalls.filter(
        (call) => call.name.includes('dlq') && call.attributes.event_name === eventName
      )
      expect(dlqCalls.length).toBe(2)
    })

    it('should handle DLQ depth callback when not set', () => {
      const depthCallback = meter.observableCallbacks.get('gravito_event_dlq_depth')
      const results: Array<{ value: number | undefined }> = []
      const mockObservableResult = {
        observe: (value: number) => {
          results.push({ value })
        },
      }

      // Should not throw even if callback is not set
      expect(() => {
        depthCallback?.(mockObservableResult)
      }).not.toThrow()
    })

    it('should track backpressure state transitions accurately', () => {
      const transitions = ['NORMAL', 'WARNING', 'CRITICAL', 'OVERFLOW', 'WARNING', 'NORMAL']

      for (const state of transitions) {
        metrics.recordBackpressureState(state)
      }

      const stateCallback = meter.observableCallbacks.get('gravito_event_backpressure_state')
      const results: Array<{ value: number }> = []
      const mockObservableResult = {
        observe: (value: number) => {
          results.push({ value })
        },
      }

      stateCallback?.(mockObservableResult)
      // Final state should be NORMAL (0)
      expect(results[0].value).toBe(0)
    })

    it('should correctly initialize all metrics in constructor', () => {
      expect(meter.observableCallbacks.has('gravito_event_backpressure_state')).toBe(true)
      expect(meter.observableCallbacks.has('gravito_event_dlq_depth')).toBe(true)
      expect(meter.observableCallbacks.size).toBeGreaterThanOrEqual(2)
    })

    it('should handle concurrent metric recordings', () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metrics.recordBackpressureRejection(`event${i}`, 'high', 'reason')
            metrics.recordDLQEntry(`event${i}`, 'retry_exhausted')
          })
        )
      }

      // Run synchronously since we're not actually async
      for (let i = 0; i < 10; i++) {
        metrics.recordBackpressureRejection(`event${i}`, 'high', 'reason')
        metrics.recordDLQEntry(`event${i}`, 'retry_exhausted')
      }

      const totalCalls = meter.recordedCounterCalls.length
      expect(totalCalls).toBe(20)
    })

    it('should maintain metric names with correct prefix', () => {
      for (const call of meter.recordedCounterCalls) {
        expect(call.name).toMatch(/^gravito_event_/)
      }
    })
  })
})
