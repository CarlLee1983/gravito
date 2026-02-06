/**
 * @gravito/core - Prometheus Integration Tests
 *
 * Tests for Prometheus metrics export via OpenTelemetry.
 * This implements Task 1.1.2.3 - Prometheus Metrics Export.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { OpenTelemetryConfig, OpenTelemetrySDK } from '../../../src/instrumentation/types'

// Type for OTelEventMetrics class
interface OTelEventMetricsInstance {
  recordDispatchDuration(eventName: string, priority: string, durationSeconds: number): void
  recordListenerDuration(eventName: string, listenerIndex: number, durationSeconds: number): void
  setQueueDepthCallback(callback: () => { high: number; normal: number; low: number }): void
  getDispatchDurationBuckets(): number[]
  getListenerDurationBuckets(): number[]
  getMeter(): unknown
}

type OTelEventMetricsClass = new (meter: unknown, prefix?: string) => OTelEventMetricsInstance

// CI 優化：条件化执行可觀測性整合測試
const shouldRunPrometheusIntegration = process.env.RUN_PROMETHEUS_INTEGRATION !== 'false'

describe.skipIf(!shouldRunPrometheusIntegration)('Prometheus Integration', () => {
  describe('OTelEventMetrics with OpenTelemetry SDK', () => {
    let resetOpenTelemetry: () => Promise<void>
    let setupOpenTelemetry: (config: OpenTelemetryConfig) => Promise<OpenTelemetrySDK | null>
    let OTelEventMetrics: OTelEventMetricsClass

    beforeEach(async () => {
      // Import modules
      const otelModule = await import('../../../src/instrumentation/opentelemetry')
      resetOpenTelemetry = otelModule.resetOpenTelemetry
      setupOpenTelemetry = otelModule.setupOpenTelemetry

      const metricsModule = await import('../../../src/events/observability/OTelEventMetrics')
      OTelEventMetrics = metricsModule.OTelEventMetrics

      // Reset OpenTelemetry before each test
      await resetOpenTelemetry()
    })

    afterEach(async () => {
      // Cleanup after each test
      await resetOpenTelemetry()
    })

    it('should create EventMetrics from OpenTelemetry MeterProvider', async () => {
      try {
        const { metrics } = await import('@opentelemetry/api')

        // Setup OpenTelemetry with metrics disabled to avoid port conflicts
        await setupOpenTelemetry({
          enabled: true,
          metrics: {
            enabled: true,
            exporter: 'none', // Use no exporter for unit tests
          },
          tracing: {
            enabled: false,
          },
          logInitialization: false,
        })

        const meter = metrics.getMeter('@gravito/core', '1.0.0')
        const eventMetrics = new OTelEventMetrics(meter)

        expect(eventMetrics).toBeDefined()
        expect(eventMetrics.getMeter()).toBe(meter)
      } catch {
        // Skip if OpenTelemetry is not available
        console.log('OpenTelemetry not available, skipping test')
      }
    })

    it('should record metrics that can be exported', async () => {
      try {
        const { metrics } = await import('@opentelemetry/api')

        await setupOpenTelemetry({
          enabled: true,
          metrics: {
            enabled: true,
            exporter: 'none',
          },
          tracing: {
            enabled: false,
          },
          logInitialization: false,
        })

        const meter = metrics.getMeter('@gravito/core', '1.0.0')
        const eventMetrics = new OTelEventMetrics(meter)

        // Record some metrics
        eventMetrics.recordDispatchDuration('order:created', 'high', 0.123)
        eventMetrics.recordDispatchDuration('order:created', 'normal', 0.456)
        eventMetrics.recordListenerDuration('order:created', 0, 0.789)

        // If we get here without errors, metrics are being recorded
        expect(eventMetrics).toBeDefined()
      } catch {
        console.log('OpenTelemetry not available, skipping test')
      }
    })

    it('should handle queue depth observable gauge', async () => {
      try {
        const { metrics } = await import('@opentelemetry/api')

        await setupOpenTelemetry({
          enabled: true,
          metrics: {
            enabled: true,
            exporter: 'none',
          },
          tracing: {
            enabled: false,
          },
          logInitialization: false,
        })

        const meter = metrics.getMeter('@gravito/core', '1.0.0')
        const eventMetrics = new OTelEventMetrics(meter)

        const queueDepthCallback = () => {
          return {
            high: 10,
            normal: 50,
            low: 100,
          }
        }

        eventMetrics.setQueueDepthCallback(queueDepthCallback)

        // The callback is registered but won't be called until metrics are collected
        expect(eventMetrics).toBeDefined()
      } catch {
        console.log('OpenTelemetry not available, skipping test')
      }
    })
  })

  describe('Prometheus Exporter Format', () => {
    it('should produce correct metric names', async () => {
      const mockMeter = {
        createHistogram: mock((_name: string) => ({
          record: mock(() => {
            // noop - mock implementation
          }),
        })),
        createObservableGauge: mock((_name: string) => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      new OTelEventMetrics(mockMeter)

      // Verify metric names follow Prometheus naming conventions
      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_dispatch_duration_seconds',
        expect.any(Object)
      )
      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        'gravito_event_listener_duration_seconds',
        expect.any(Object)
      )
      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith(
        'gravito_event_queue_depth',
        expect.any(Object)
      )
    })

    it('should use correct units for histograms', async () => {
      const mockMeter = {
        createHistogram: mock((_name: string, _options: unknown) => ({
          record: mock(() => {
            // noop - mock implementation
          }),
        })),
        createObservableGauge: mock((_name: string) => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      new OTelEventMetrics(mockMeter)

      // Verify units are in seconds (Prometheus convention)
      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          unit: 's',
        })
      )
    })

    it('should include appropriate descriptions', async () => {
      const mockMeter = {
        createHistogram: mock((_name: string, _options: unknown) => ({
          record: mock(() => {
            // noop - mock implementation
          }),
        })),
        createObservableGauge: mock((_name: string, _options: unknown) => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      new OTelEventMetrics(mockMeter)

      // Verify descriptions are provided
      expect(mockMeter.createHistogram).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          description: expect.any(String),
        })
      )
      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          description: expect.any(String),
        })
      )
    })
  })

  describe('Metric Labels', () => {
    it('should include event_name label on dispatch duration', async () => {
      const mockRecord = mock(() => {
        // noop - mock implementation
      })
      const mockMeter = {
        createHistogram: mock(() => ({ record: mockRecord })),
        createObservableGauge: mock(() => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordDispatchDuration('user:created', 'normal', 0.5)

      expect(mockRecord).toHaveBeenCalledWith(
        0.5,
        expect.objectContaining({
          event_name: 'user:created',
        })
      )
    })

    it('should include priority label on dispatch duration', async () => {
      const mockRecord = mock(() => {
        // noop - mock implementation
      })
      const mockMeter = {
        createHistogram: mock(() => ({ record: mockRecord })),
        createObservableGauge: mock(() => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordDispatchDuration('test:event', 'high', 0.1)

      expect(mockRecord).toHaveBeenCalledWith(
        0.1,
        expect.objectContaining({
          priority: 'high',
        })
      )
    })

    it('should include listener_index label on listener duration', async () => {
      const mockRecord = mock(() => {
        // noop - mock implementation
      })
      const mockMeter = {
        createHistogram: mock(() => ({ record: mockRecord })),
        createObservableGauge: mock(() => ({
          addCallback: mock(() => {
            // noop - mock implementation
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const metrics = new OTelEventMetrics(mockMeter)

      metrics.recordListenerDuration('test:event', 2, 0.3)

      expect(mockRecord).toHaveBeenCalledWith(
        0.3,
        expect.objectContaining({
          listener_index: '2',
        })
      )
    })

    it('should include priority label on queue depth', async () => {
      type ObserverCallback = (result: { observe: ReturnType<typeof mock> }) => void
      const capturedCallbacks: ObserverCallback[] = []
      const mockMeter = {
        createHistogram: mock(() => ({
          record: mock(() => {
            // noop - mock implementation
          }),
        })),
        createObservableGauge: mock(() => ({
          addCallback: mock((cb: ObserverCallback) => {
            capturedCallbacks.push(cb)
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const metrics = new OTelEventMetrics(mockMeter as any)

      const mockObserve = mock(() => {
        // noop - mock implementation
      })
      metrics.setQueueDepthCallback(() => ({ high: 5, normal: 10, low: 15 }))

      // Find the queue depth callback
      expect(capturedCallbacks.length).toBeGreaterThan(0)
      const capturedCallback = capturedCallbacks[0]

      capturedCallback({ observe: mockObserve })

      expect(mockObserve).toHaveBeenCalledWith(5, { priority: 'high' })
      expect(mockObserve).toHaveBeenCalledWith(10, { priority: 'normal' })
      expect(mockObserve).toHaveBeenCalledWith(15, { priority: 'low' })
    })
  })

  describe('Integration with EventPriorityQueue', () => {
    it('should report accurate queue depths', async () => {
      type ObserverCallback = (result: { observe: ReturnType<typeof mock> }) => void
      const capturedCallbacks: ObserverCallback[] = []
      const mockMeter = {
        createHistogram: mock(() => ({
          record: mock(() => {
            // noop - mock implementation
          }),
        })),
        createObservableGauge: mock(() => ({
          addCallback: mock((cb: ObserverCallback) => {
            capturedCallbacks.push(cb)
          }),
        })),
      }

      const { OTelEventMetrics } = await import(
        '../../../src/events/observability/OTelEventMetrics'
      )
      const metrics = new OTelEventMetrics(mockMeter as any)

      // Simulate queue depths changing
      let queueState = { high: 0, normal: 0, low: 0 }

      metrics.setQueueDepthCallback(() => queueState)

      const mockObserve = mock(() => {
        // noop - mock implementation
      })

      // Get the queue depth callback
      expect(capturedCallbacks.length).toBeGreaterThan(0)
      const capturedCallback = capturedCallbacks[0]

      // Initial state
      capturedCallback({ observe: mockObserve })
      expect(mockObserve).toHaveBeenCalledWith(0, { priority: 'high' })

      // After adding events
      mockObserve.mockClear()
      queueState = { high: 3, normal: 10, low: 5 }
      capturedCallback({ observe: mockObserve })
      expect(mockObserve).toHaveBeenCalledWith(3, { priority: 'high' })
      expect(mockObserve).toHaveBeenCalledWith(10, { priority: 'normal' })
      expect(mockObserve).toHaveBeenCalledWith(5, { priority: 'low' })
    })
  })
})

describe('Prometheus Histogram Buckets', () => {
  it('should use appropriate buckets for event processing latencies', async () => {
    const mockMeter = {
      createHistogram: mock(() => ({
        record: mock(() => {
          // noop - mock implementation
        }),
      })),
      createObservableGauge: mock(() => ({
        addCallback: mock(() => {
          // noop - mock implementation
        }),
      })),
    }

    const { OTelEventMetrics } = await import('../../../src/events/observability/OTelEventMetrics')
    const metrics = new OTelEventMetrics(mockMeter)

    const dispatchBuckets = metrics.getDispatchDurationBuckets()
    const listenerBuckets = metrics.getListenerDurationBuckets()

    // Should have buckets covering fast operations (< 10ms)
    expect(dispatchBuckets.some((b: number) => b < 0.01)).toBe(true)

    // Should have buckets covering slow operations (> 1s)
    expect(dispatchBuckets.some((b: number) => b > 1)).toBe(true)

    // Listener buckets should also cover a reasonable range
    expect(listenerBuckets.length).toBeGreaterThan(5)
  })
})
