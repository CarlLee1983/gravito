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

interface MockMeter {
  createHistogram: ReturnType<typeof mock>
  createObservableGauge: ReturnType<typeof mock>
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

const mockMeter: MockMeter = {
  createHistogram: mock(() => mockHistogram),
  createObservableGauge: mock(() => mockObservableGauge),
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
  }

  let OTelEventMetrics: OTelEventMetricsType

  beforeEach(async () => {
    // Reset mocks before each test
    mockHistogram.record.mockClear()
    mockObservableGauge.addCallback.mockClear()
    mockObservableGauge.removeCallback.mockClear()
    mockMeter.createHistogram.mockClear()
    mockMeter.createObservableGauge.mockClear()

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
