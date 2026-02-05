import { describe, expect, it } from 'bun:test'
import { MetricsRegistry } from '@gravito/monitor'
import { ObservableHookManager } from '../../../src/events/observability/ObservableHookManager'

describe('Observable Event System Integration', () => {
  describe('end-to-end event dispatch with metrics', () => {
    it('should collect metrics through complete event lifecycle', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let listenerExecuted = false
      manager.addAction('order:created', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        listenerExecuted = true
      })

      await manager.doActionAsync('order:created', { orderId: '123' }, { priority: 'high' })

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(listenerExecuted).toBe(true)

      const prometheus = registry.toPrometheus()

      // Verify all expected metrics are present
      expect(prometheus).toContain('dispatch_latency_seconds')
      expect(prometheus).toContain('queue_depth')
      expect(prometheus).toContain('processed_total')
      expect(prometheus).toContain('event_name="order:created"')
      expect(prometheus).toContain('priority="high"')
    })

    it('should track metrics for multiple event types with different priorities', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let orderCreated = false
      let userRegistered = false
      let emailSent = false

      manager.addAction('order:created', async () => {
        orderCreated = true
      })
      manager.addAction('user:registered', async () => {
        userRegistered = true
      })
      manager.addAction('email:sent', async () => {
        emailSent = true
      })

      // Dispatch events with different priorities
      await manager.doActionAsync('order:created', {}, { priority: 'high' })
      await manager.doActionAsync('user:registered', {}, { priority: 'normal' })
      await manager.doActionAsync('email:sent', {}, { priority: 'low' })

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(orderCreated).toBe(true)
      expect(userRegistered).toBe(true)
      expect(emailSent).toBe(true)

      const prometheus = registry.toPrometheus()

      // Verify metrics for each event
      expect(prometheus).toContain('event_name="order:created"')
      expect(prometheus).toContain('priority="high"')
      expect(prometheus).toContain('event_name="user:registered"')
      expect(prometheus).toContain('priority="normal"')
      expect(prometheus).toContain('event_name="email:sent"')
      expect(prometheus).toContain('priority="low"')
    })

    it('should track multiple listeners per event', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let listener1Called = false
      let listener2Called = false
      let listener3Called = false

      manager.addAction('test:event', async () => {
        listener1Called = true
      })
      manager.addAction('test:event', async () => {
        listener2Called = true
      })
      manager.addAction('test:event', async () => {
        listener3Called = true
      })

      await manager.doActionAsync('test:event', {})

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(listener1Called).toBe(true)
      expect(listener2Called).toBe(true)
      expect(listener3Called).toBe(true)

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('event_name="test:event"')
    })
  })

  describe('Prometheus metrics export', () => {
    it('should export valid Prometheus format', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('sample:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })

      await manager.doActionAsync('sample:event', {}, { priority: 'normal' })

      const prometheus = registry.toPrometheus()

      // Check Prometheus format
      expect(prometheus).toContain('# TYPE')
      expect(prometheus).toContain('# HELP')
      expect(prometheus.split('\n').length).toBeGreaterThan(0)

      // Check lines are properly formatted
      const lines = prometheus
        .split('\n')
        .filter((line) => !line.startsWith('#') && line.length > 0)
      for (const line of lines) {
        // Each metric line should have format: metric_name{labels} value
        expect(line).toMatch(/^[a-z_]+[a-z0-9_]*.*\d+(\.\d+)?$/)
      }
    })

    it('should track latency distribution across buckets', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      // Create events with varying execution times
      manager.addAction('fast:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      })
      manager.addAction('slow:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      await manager.doActionAsync('fast:event', {})
      await manager.doActionAsync('slow:event', {})

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 150))

      const prometheus = registry.toPrometheus()

      // Both events should be recorded
      expect(prometheus).toContain('event_name="fast:event"')
      expect(prometheus).toContain('event_name="slow:event"')

      // Verify histogram buckets exist
      expect(prometheus).toContain('_bucket')
      expect(prometheus).toContain('_sum')
      expect(prometheus).toContain('_count')
    })
  })

  describe('observability with tracing', () => {
    it('should support distributed tracing alongside metrics', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
          tracing: true,
        }
      )

      expect(manager.getTracer()).toBeDefined()

      manager.addAction('traced:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await manager.doActionAsync('traced:event', {})

      // Both tracer and metrics should be available
      expect(manager.getMetrics()).toBeDefined()
      expect(manager.getTracer()).toBeDefined()

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('event_name="traced:event"')
    })
  })

  describe('observability feature toggle', () => {
    it('should work without observability when disabled', async () => {
      const manager = new ObservableHookManager({ migrationMode: 'async' })

      let called = false
      manager.addAction('normal:event', async () => {
        called = true
      })

      await manager.doActionAsync('normal:event', {})

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(called).toBe(true)
      expect(manager.getMetrics()).toBeUndefined()
      expect(manager.getTracer()).toBeUndefined()
    })

    it('should enable observability dynamically', async () => {
      const manager = new ObservableHookManager({ migrationMode: 'async' })

      expect(manager.getMetrics()).toBeUndefined()

      const registry = new MetricsRegistry({ defaultMetrics: false })
      manager.setObservabilityConfig({
        enabled: true,
        metrics: registry,
      })

      expect(manager.getMetrics()).toBeDefined()

      manager.addAction('dynamic:event', async () => {})
      await manager.doActionAsync('dynamic:event', {})

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('event_name="dynamic:event"')
    })
  })

  describe('error handling with metrics', () => {
    it('should still collect metrics when listener throws error', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('error:event', async () => {
        throw new Error('Listener error')
      })

      try {
        await manager.doActionAsync('error:event', {})
        // The error happens async in the queue
      } catch {
        // Expected to not throw at dispatch time
      }

      // Wait for async processing and error handling
      await new Promise((resolve) => setTimeout(resolve, 100))

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('event_name="error:event"')
    })
  })

  describe('queue depth tracking', () => {
    it('should track queue depth by priority', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('slow:task', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      // Dispatch multiple tasks with different priorities
      await manager.doActionAsync('slow:task', {}, { priority: 'high' })
      await manager.doActionAsync('slow:task', {}, { priority: 'normal' })
      await manager.doActionAsync('slow:task', {}, { priority: 'low' })

      // Let some process
      await new Promise((resolve) => setTimeout(resolve, 50))

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('queue_depth')
      expect(prometheus).toContain('priority="high"')
      expect(prometheus).toContain('priority="normal"')
      expect(prometheus).toContain('priority="low"')
    })
  })
})
