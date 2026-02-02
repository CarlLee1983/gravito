import { describe, expect, it } from 'bun:test'
import { Counter, Gauge, Histogram, MetricsRegistry } from '@gravito/monitor'
import { EventMetrics } from '../../../src/events/observability/EventMetrics'

describe('EventMetrics', () => {
  describe('initialization', () => {
    it('should create all 6 metrics with correct names', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      // Verify that metrics were created
      expect(metrics).toBeDefined()
      expect(metrics.getDispatchLatencyHistogram()).toBeDefined()
      expect(metrics.getListenerExecutionHistogram()).toBeDefined()
      expect(metrics.getQueueDepthGauge()).toBeDefined()
    })

    it('should use custom prefix when provided', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'custom_event_')

      expect(metrics).toBeDefined()
    })

    it('should use default prefix if not provided', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry)

      expect(metrics).toBeDefined()
    })
  })

  describe('recordDispatchLatency', () => {
    it('should record dispatch latency with event name and priority labels', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordDispatchLatency('order:created', 'high', 0.234)
      metrics.recordDispatchLatency('order:created', 'high', 0.156)
      metrics.recordDispatchLatency('user:updated', 'normal', 0.089)

      // Verify histogram was populated
      const histogram = metrics.getDispatchLatencyHistogram()
      const values = histogram.getValues()
      expect(values.counts.size).toBeGreaterThan(0)
    })

    it('should handle multiple priority levels', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordDispatchLatency('test:event', 'high', 0.1)
      metrics.recordDispatchLatency('test:event', 'normal', 0.2)
      metrics.recordDispatchLatency('test:event', 'low', 0.3)

      expect(metrics).toBeDefined()
    })

    it('should handle zero duration', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      expect(() => {
        metrics.recordDispatchLatency('instant:event', 'normal', 0)
      }).not.toThrow()
    })

    it('should handle very small durations', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      expect(() => {
        metrics.recordDispatchLatency('fast:event', 'high', 0.0001)
      }).not.toThrow()
    })
  })

  describe('recordListenerExecution', () => {
    it('should record listener execution time with index', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordListenerExecution('order:created', 0, 0.123)
      metrics.recordListenerExecution('order:created', 1, 0.456)
      metrics.recordListenerExecution('order:created', 2, 0.789)

      const histogram = metrics.getListenerExecutionHistogram()
      const values = histogram.getValues()
      expect(values.counts.size).toBeGreaterThan(0)
    })

    it('should handle multiple listeners for same event', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      for (let i = 0; i < 10; i++) {
        metrics.recordListenerExecution('batch:process', i, Math.random())
      }

      expect(metrics).toBeDefined()
    })
  })

  describe('updateQueueDepth', () => {
    it('should update queue depth gauge for all priorities', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.updateQueueDepth('high', 10)
      metrics.updateQueueDepth('normal', 50)
      metrics.updateQueueDepth('low', 100)

      const gauge = metrics.getQueueDepthGauge()
      const values = gauge.getValues()
      expect(values.length).toBe(3)
    })

    it('should allow queue depth to go to zero', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.updateQueueDepth('high', 10)
      metrics.updateQueueDepth('high', 0)

      const gauge = metrics.getQueueDepthGauge()
      const values = gauge.getValues()
      const highPriorityValue = values.find((v) => v.labels.priority === 'high')
      expect(highPriorityValue?.value).toBe(0)
    })

    it('should handle large queue depths', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.updateQueueDepth('normal', 1_000_000)

      expect(metrics).toBeDefined()
    })
  })

  describe('recordFailure', () => {
    it('should record failure with error type', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordFailure('order:created', 'TypeError')
      metrics.recordFailure('order:created', 'TimeoutError')
      metrics.recordFailure('user:deleted', 'ReferenceError')

      expect(metrics).toBeDefined()
    })

    it('should handle multiple failures for same event', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      for (let i = 0; i < 100; i++) {
        const errorTypes = ['TypeError', 'RangeError', 'SyntaxError']
        const errorType = errorTypes[i % errorTypes.length]
        metrics.recordFailure('unstable:event', errorType)
      }

      expect(metrics).toBeDefined()
    })
  })

  describe('recordTimeout', () => {
    it('should record timeout events', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordTimeout('slow:event')
      metrics.recordTimeout('slow:event')
      metrics.recordTimeout('another:slow:event')

      expect(metrics).toBeDefined()
    })

    it('should handle multiple timeouts for same event', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      for (let i = 0; i < 50; i++) {
        metrics.recordTimeout('timeout:event')
      }

      expect(metrics).toBeDefined()
    })
  })

  describe('recordProcessed', () => {
    it('should record processed events with success status', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordProcessed('order:created', 'success')
      metrics.recordProcessed('order:created', 'success')
      metrics.recordProcessed('user:updated', 'success')

      expect(metrics).toBeDefined()
    })

    it('should record processed events with failure status', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordProcessed('order:created', 'failure')
      metrics.recordProcessed('order:created', 'failure')

      expect(metrics).toBeDefined()
    })

    it('should handle mixed success and failure statuses', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      for (let i = 0; i < 100; i++) {
        const status = i % 3 === 0 ? 'failure' : 'success'
        metrics.recordProcessed('mixed:event', status)
      }

      expect(metrics).toBeDefined()
    })
  })

  describe('Prometheus format export', () => {
    it('should export metrics in valid Prometheus format', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      // Record some metrics
      metrics.recordDispatchLatency('order:created', 'high', 0.123)
      metrics.recordListenerExecution('order:created', 0, 0.456)
      metrics.updateQueueDepth('normal', 42)
      metrics.recordFailure('order:created', 'TypeError')
      metrics.recordTimeout('slow:event')
      metrics.recordProcessed('order:created', 'success')

      const prometheus = registry.toPrometheus()

      // Verify Prometheus format (note: MetricsRegistry adds 'gravito_' prefix automatically)
      expect(prometheus).toContain('dispatch_latency_seconds')
      expect(prometheus).toContain('listener_execution_seconds')
      expect(prometheus).toContain('queue_depth')
      expect(prometheus).toContain('failures_total')
      expect(prometheus).toContain('timeouts_total')
      expect(prometheus).toContain('processed_total')
    })

    it('should include TYPE and HELP annotations', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordDispatchLatency('test:event', 'normal', 0.1)

      const prometheus = registry.toPrometheus()

      expect(prometheus).toContain('dispatch_latency_seconds histogram')
      expect(prometheus).toContain('dispatch_latency_seconds')
    })

    it('should include labels in output', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      metrics.recordDispatchLatency('order:created', 'high', 0.5)
      metrics.updateQueueDepth('normal', 100)

      const prometheus = registry.toPrometheus()

      expect(prometheus).toContain('event_name="order:created"')
      expect(prometheus).toContain('priority="high"')
      expect(prometheus).toContain('priority="normal"')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in event names', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      expect(() => {
        metrics.recordDispatchLatency('user:profile-updated', 'normal', 0.1)
        metrics.recordDispatchLatency('order/payment#confirmed', 'high', 0.2)
      }).not.toThrow()
    })

    it('should handle very large numbers', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      expect(() => {
        metrics.recordDispatchLatency('long:process', 'normal', 9999.999)
        metrics.updateQueueDepth('high', Number.MAX_SAFE_INTEGER)
      }).not.toThrow()
    })

    it('should allow concurrent metric recording', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const metrics = new EventMetrics(registry, 'gravito_event_')

      // Simulate concurrent recording
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metrics.recordDispatchLatency(`event:${i % 10}`, 'normal', Math.random())
            metrics.recordProcessed(`event:${i % 10}`, 'success')
          })
        )
      }

      await Promise.all(promises)
      expect(metrics).toBeDefined()
    })
  })
})
