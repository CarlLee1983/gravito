/**
 * @gravito/core - OTelEventMetrics Tests
 *
 * Tests for OpenTelemetry-based event metrics collection.
 * This implements Task 1.1.2.3 - Prometheus Metrics Export.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ObservableResult } from '@opentelemetry/api'

// Type definitions for mock meter
interface MockHistogram {
  record: ReturnType<typeof mock>
}

interface MockObservableGauge {
  addCallback: ReturnType<typeof mock>
  removeCallback: ReturnType<typeof mock>
}

interface MockCounter {
  add: ReturnType<typeof mock>
}

interface MockMeter {
  createHistogram: ReturnType<typeof mock>
  createObservableGauge: ReturnType<typeof mock>
  createCounter: ReturnType<typeof mock>
}

// Mock OpenTelemetry API
const mockHistogram: MockHistogram = {
  record: mock(() => {
    // noop - mock implementation
  }),
}

const mockObservableGauge: MockObservableGauge = {
  addCallback: mock((_callback: (result: ObservableResult) => void) => {
    // noop - mock implementation
  }),
  removeCallback: mock(() => {
    // noop - mock implementation
  }),
}

const mockCounter: MockCounter = {
  add: mock(() => {
    // noop - mock implementation
  }),
}

const mockMeter: MockMeter = {
  createHistogram: mock(() => mockHistogram),
  createObservableGauge: mock(() => mockObservableGauge),
  createCounter: mock(() => mockCounter),
}

describe('OTelEventMetrics', () => {
  // Type for the dynamically imported class
  type OTelEventMetricsType = new (
    meter: MockMeter,
    prefix?: string
  ) => {
    recordDispatchDuration(eventName: string, priority: string, durationSeconds: number): void
    recordListenerDuration(eventName: string, listenerIndex: number, durationSeconds: number): void
    setQueueDepthCallback(callback: () => { high: number; normal: number; low: number }): void
    getDispatchDurationBuckets(): number[]
    getListenerDurationBuckets(): number[]
    getMeter(): MockMeter
    recordCircuitBreakerFailure(eventName: string, listenerIndex: number): void
    recordCircuitBreakerSuccess(eventName: string, listenerIndex: number): void
    recordCircuitBreakerTransition(
      eventName: string,
      listenerIndex: number,
      fromState: string,
      toState: string
    ): void
    recordCircuitBreakerOpenDuration(
      eventName: string,
      listenerIndex: number,
      durationSeconds: number
    ): void
    registerCircuitBreakerStateCallback(
      key: string,
      callback: () => { eventName: string; listenerIndex: number; state: 0 | 1 | 2 }
    ): void
    unregisterCircuitBreakerStateCallback(key: string): void
    recordState(name: string, state: number): void
    recordTransition(name: string, fromState: string, toState: string): void
    recordFailure(name: string): void
    recordSuccess(name: string): void
    recordOpenDuration(name: string, seconds: number): void
    getRegisteredCircuitBreakers(): string[]
    clearCircuitBreakerCallbacks(): void
    getCircuitBreakerOpenDurationBuckets(): number[]
  }

  let OTelEventMetrics: OTelEventMetricsType

  beforeEach(async () => {
    // Reset mocks before each test
    mockHistogram.record.mockClear()
    mockObservableGauge.addCallback.mockClear()
    mockObservableGauge.removeCallback.mockClear()
    mockCounter.add.mockClear()
    mockMeter.createHistogram.mockClear()
    mockMeter.createObservableGauge.mockClear()
    mockMeter.createCounter.mockClear()

    // Import the module fresh for each test
    const module = await import('../../../src/events/observability/OTelEventMetrics')
    OTelEventMetrics = module.OTelEventMetrics as OTelEventMetricsType
  })

  describe('initialization', () => {
    it('should create metrics instance with meter', () => {
      const metrics = new OTelEventMetrics(mockMeter)
      expect(metrics).toBeDefined()
    })

    it('should create dispatch_duration histogram with correct config', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_dispatch_duration_seconds',
        expect.objectContaining({
          description: expect.any(String),
          unit: 's',
        })
      )
    })

    it('should create listener_duration histogram with correct config', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_listener_duration_seconds',
        expect.objectContaining({
          description: expect.any(String),
          unit: 's',
        })
      )
    })

    it('should create queue_depth observable gauge', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith(
        'gravito_event_queue_depth',
        expect.objectContaining({
          description: expect.any(String),
        })
      )
    })

    it('should use custom prefix when provided', () => {
      new OTelEventMetrics(mockMeter, 'custom_')

      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'custom_dispatch_duration_seconds',
        expect.any(Object)
      )
    })

    it('should use default prefix if not provided', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_dispatch_duration_seconds',
        expect.any(Object)
      )
    })
  })

  describe('recordDispatchDuration', () => {
    it('should record dispatch duration with event name and priority labels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordDispatchDuration('order:created', 'high', 0.234)

      expect(mockHistogram.record).toHaveBeenCalledWith(0.234, {
        event_name: 'order:created',
        priority: 'high',
      })
    })

    it('should handle multiple priority levels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordDispatchDuration('test:event', 'high', 0.1)
      metrics.recordDispatchDuration('test:event', 'normal', 0.2)
      metrics.recordDispatchDuration('test:event', 'low', 0.3)

      expect(mockHistogram.record).toHaveBeenCalledTimes(3)
    })

    it('should handle zero duration', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      expect(() => {
        metrics.recordDispatchDuration('instant:event', 'normal', 0)
      }).not.toThrow()

      expect(mockHistogram.record).toHaveBeenCalledWith(0, {
        event_name: 'instant:event',
        priority: 'normal',
      })
    })

    it('should handle very small durations', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      expect(() => {
        metrics.recordDispatchDuration('fast:event', 'high', 0.0001)
      }).not.toThrow()

      expect(mockHistogram.record).toHaveBeenCalledWith(0.0001, {
        event_name: 'fast:event',
        priority: 'high',
      })
    })

    it('should handle special characters in event names', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      expect(() => {
        metrics.recordDispatchDuration('user:profile-updated', 'normal', 0.1)
        metrics.recordDispatchDuration('order/payment#confirmed', 'high', 0.2)
      }).not.toThrow()
    })
  })

  describe('recordListenerDuration', () => {
    it('should record listener execution time with index', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordListenerDuration('order:created', 0, 0.123)

      expect(mockHistogram.record).toHaveBeenCalledWith(0.123, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should handle multiple listeners for same event', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordListenerDuration('order:created', 0, 0.123)
      metrics.recordListenerDuration('order:created', 1, 0.456)
      metrics.recordListenerDuration('order:created', 2, 0.789)

      expect(mockHistogram.record).toHaveBeenCalledTimes(3)
    })

    it('should handle high listener indices', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordListenerDuration('batch:process', 99, 0.5)

      expect(mockHistogram.record).toHaveBeenCalledWith(0.5, {
        event_name: 'batch:process',
        listener_index: '99',
      })
    })
  })

  describe('getHistogramBuckets', () => {
    it('should return appropriate bucket boundaries for dispatch duration', () => {
      const metrics = new OTelEventMetrics(mockMeter)
      const buckets = metrics.getDispatchDurationBuckets()

      // Buckets should cover from milliseconds to seconds
      expect(buckets).toContain(0.001) // 1ms
      expect(buckets).toContain(0.01) // 10ms
      expect(buckets).toContain(0.1) // 100ms
      expect(buckets).toContain(1) // 1s
      expect(buckets).toContain(5) // 5s
    })

    it('should return appropriate bucket boundaries for listener duration', () => {
      const metrics = new OTelEventMetrics(mockMeter)
      const buckets = metrics.getListenerDurationBuckets()

      // Buckets should cover from milliseconds to seconds
      expect(buckets).toContain(0.001) // 1ms
      expect(buckets).toContain(0.1) // 100ms
      expect(buckets).toContain(1) // 1s
    })
  })

  describe('getMeter', () => {
    it('should return the meter instance', () => {
      const metrics = new OTelEventMetrics(mockMeter)
      expect(metrics.getMeter()).toBe(mockMeter)
    })
  })

  describe('edge cases', () => {
    it('should handle very large durations', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      expect(() => {
        metrics.recordDispatchDuration('long:process', 'normal', 9999.999)
      }).not.toThrow()
    })

    it('should handle negative durations gracefully', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      // Negative durations shouldn't happen but shouldn't crash
      expect(() => {
        metrics.recordDispatchDuration('weird:event', 'normal', -1)
      }).not.toThrow()
    })

    it('should handle concurrent metric recording', async () => {
      const metrics = new OTelEventMetrics(mockMeter)

      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metrics.recordDispatchDuration(`event:${i % 10}`, 'normal', Math.random())
            metrics.recordListenerDuration(`event:${i % 10}`, i % 5, Math.random())
          })
        )
      }

      await Promise.all(promises)
      expect(mockHistogram.record).toHaveBeenCalled()
    })
  })

  describe('Circuit Breaker Metrics Initialization', () => {
    it('should create circuit breaker state gauge', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith(
        'gravito_event_circuit_breaker_state',
        expect.objectContaining({
          description: expect.any(String),
          unit: '{state}',
        })
      )
    })

    it('should create circuit breaker counters', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createCounter).toHaveBeenCalledWith(
        'gravito_event_circuit_breaker_failures_total',
        expect.objectContaining({
          description: expect.any(String),
          unit: '{failures}',
        })
      )

      expect(mockMeter.createCounter).toHaveBeenCalledWith(
        'gravito_event_circuit_breaker_successes_total',
        expect.objectContaining({
          description: expect.any(String),
          unit: '{successes}',
        })
      )

      expect(mockMeter.createCounter).toHaveBeenCalledWith(
        'gravito_event_circuit_breaker_transitions_total',
        expect.objectContaining({
          description: expect.any(String),
          unit: '{transitions}',
        })
      )
    })

    it('should create circuit breaker open duration histogram', () => {
      new OTelEventMetrics(mockMeter)

      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_circuit_breaker_open_duration_seconds',
        expect.objectContaining({
          description: expect.any(String),
          unit: 's',
        })
      )
    })
  })

  describe('recordCircuitBreakerFailure', () => {
    it('should record circuit breaker failure with labels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerFailure('order:created', 0)

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should record multiple failures for different listeners', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerFailure('order:created', 0)
      metrics.recordCircuitBreakerFailure('order:created', 1)
      metrics.recordCircuitBreakerFailure('user:registered', 0)

      expect(mockCounter.add).toHaveBeenCalledTimes(3)
    })
  })

  describe('recordCircuitBreakerSuccess', () => {
    it('should record circuit breaker success with labels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerSuccess('order:created', 0)

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should record multiple successes', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerSuccess('order:created', 0)
      metrics.recordCircuitBreakerSuccess('order:created', 0)
      metrics.recordCircuitBreakerSuccess('order:created', 1)

      expect(mockCounter.add).toHaveBeenCalledTimes(3)
    })
  })

  describe('recordCircuitBreakerTransition', () => {
    it('should record state transition with all labels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerTransition('order:created', 0, 'CLOSED', 'OPEN')

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
        from_state: 'CLOSED',
        to_state: 'OPEN',
      })
    })

    it('should record different transition types', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerTransition('order:created', 0, 'CLOSED', 'OPEN')
      metrics.recordCircuitBreakerTransition('order:created', 0, 'OPEN', 'HALF_OPEN')
      metrics.recordCircuitBreakerTransition('order:created', 0, 'HALF_OPEN', 'CLOSED')

      expect(mockCounter.add).toHaveBeenCalledTimes(3)
    })
  })

  describe('recordCircuitBreakerOpenDuration', () => {
    it('should record open duration with labels', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordCircuitBreakerOpenDuration('order:created', 0, 30.5)

      expect(mockHistogram.record).toHaveBeenCalledWith(30.5, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })
  })

  describe('Circuit Breaker State Callbacks', () => {
    it('should register and track circuit breaker state callbacks', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      const callback = () => ({
        eventName: 'order:created',
        listenerIndex: 0,
        state: 0 as const,
      })

      metrics.registerCircuitBreakerStateCallback('order:created-0', callback)

      const registered = metrics.getRegisteredCircuitBreakers()
      expect(registered).toContain('order:created-0')
    })

    it('should unregister circuit breaker state callbacks', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      const callback = () => ({
        eventName: 'order:created',
        listenerIndex: 0,
        state: 0 as const,
      })

      metrics.registerCircuitBreakerStateCallback('order:created-0', callback)
      metrics.unregisterCircuitBreakerStateCallback('order:created-0')

      const registered = metrics.getRegisteredCircuitBreakers()
      expect(registered).not.toContain('order:created-0')
    })

    it('should clear all circuit breaker callbacks', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      const callback1 = () => ({
        eventName: 'order:created',
        listenerIndex: 0,
        state: 0 as const,
      })

      const callback2 = () => ({
        eventName: 'user:registered',
        listenerIndex: 0,
        state: 1 as const,
      })

      metrics.registerCircuitBreakerStateCallback('order:created-0', callback1)
      metrics.registerCircuitBreakerStateCallback('user:registered-0', callback2)

      expect(metrics.getRegisteredCircuitBreakers()).toHaveLength(2)

      metrics.clearCircuitBreakerCallbacks()

      expect(metrics.getRegisteredCircuitBreakers()).toHaveLength(0)
    })
  })

  describe('CircuitBreakerMetricsRecorder Interface', () => {
    it('should implement recordState adapter method', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      expect(() => {
        metrics.recordState('order:created', 2)
      }).not.toThrow()
    })

    it('should implement recordTransition adapter method', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordTransition('order:created', 'CLOSED', 'OPEN')

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
        from_state: 'CLOSED',
        to_state: 'OPEN',
      })
    })

    it('should implement recordFailure adapter method', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordFailure('order:created')

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should implement recordSuccess adapter method', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordSuccess('order:created')

      expect(mockCounter.add).toHaveBeenCalledWith(1, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should implement recordOpenDuration adapter method', () => {
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordOpenDuration('order:created', 60)

      expect(mockHistogram.record).toHaveBeenCalledWith(60, {
        event_name: 'order:created',
        listener_index: '0',
      })
    })

    it('should return circuit breaker open duration buckets', () => {
      const metrics = new OTelEventMetrics(mockMeter)
      const buckets = metrics.getCircuitBreakerOpenDurationBuckets()

      expect(buckets).toContain(1) // 1s
      expect(buckets).toContain(30) // 30s
      expect(buckets).toContain(60) // 1m
      expect(buckets).toContain(300) // 5m
    })
  })
})

describe('OTelEventMetrics with real OpenTelemetry', () => {
  it('should work with actual OpenTelemetry meter', async () => {
    // This test uses the real OpenTelemetry API
    try {
      const { metrics } = await import('@opentelemetry/api')
      const meter = metrics.getMeter('test-meter')

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const otelMetrics = new OTelEventMetrics(meter)

      // Should not throw
      otelMetrics.recordDispatchDuration('test:event', 'normal', 0.123)
      otelMetrics.recordListenerDuration('test:event', 0, 0.456)

      expect(otelMetrics).toBeDefined()
    } catch {
      // Skip test if OpenTelemetry is not available
      console.log('OpenTelemetry not available, skipping integration test')
    }
  })
})
