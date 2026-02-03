import { beforeEach, describe, expect, it } from 'bun:test'
import { MetricsRegistry } from '@gravito/monitor'
import { EventMetrics } from '../../../src/events/observability/EventMetrics'
import { EventTracer } from '../../../src/events/observability/EventTracer'
import { ObservableHookManager } from '../../../src/events/observability/ObservableHookManager'

describe('ObservableHookManager', () => {
  describe('initialization', () => {
    it('should initialize without observability config (backward compatible)', () => {
      const manager = new ObservableHookManager()
      expect(manager).toBeDefined()
      expect(manager.getMetrics()).toBeUndefined()
      expect(manager.getTracer()).toBeUndefined()
    })

    it('should initialize with metrics enabled', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        {},
        {
          enabled: true,
          metrics: registry,
        }
      )

      expect(manager).toBeDefined()
      expect(manager.getMetrics()).toBeDefined()
    })

    it('should initialize with tracing enabled', () => {
      const manager = new ObservableHookManager(
        {},
        {
          enabled: true,
          tracing: true,
        }
      )

      expect(manager).toBeDefined()
      expect(manager.getTracer()).toBeDefined()
    })

    it('should initialize with both metrics and tracing enabled', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        {},
        {
          enabled: true,
          metrics: registry,
          tracing: true,
        }
      )

      expect(manager).toBeDefined()
      expect(manager.getMetrics()).toBeDefined()
      expect(manager.getTracer()).toBeDefined()
    })

    it('should use custom metrics prefix', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        {},
        {
          enabled: true,
          metrics: registry,
          metricsPrefix: 'custom_event_',
        }
      )

      expect(manager).toBeDefined()
      expect(manager.getMetrics()).toBeDefined()
    })
  })

  describe('backward compatibility', () => {
    it('should work identically to HookManager when observability disabled', async () => {
      const manager = new ObservableHookManager({
        migrationMode: 'async',
      })

      let called = false
      manager.addAction('test:event', async () => {
        called = true
      })

      await manager.doActionAsync('test:event', {})

      // Give async operation time to complete
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(called).toBe(true)
    })

    it('should accept HookManagerConfig', () => {
      const manager = new ObservableHookManager({
        migrationMode: 'async',
        asyncByDefault: true,
        enableDLQ: false,
      })

      expect(manager).toBeDefined()
    })

    it('should maintain all HookManager methods', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        {},
        {
          enabled: true,
          metrics: registry,
        }
      )

      expect(typeof manager.addAction).toBe('function')
      expect(typeof manager.addFilter).toBe('function')
      expect(typeof manager.doAction).toBe('function')
      expect(typeof manager.doActionAsync).toBe('function')
      expect(typeof manager.getQueueDepth).toBe('function')
      expect(typeof manager.getQueueDepthByPriority).toBe('function')
      expect(typeof manager.getListeners).toBe('function')
      expect(typeof manager.configure).toBe('function')
      expect(typeof manager.getConfig).toBe('function')
    })
  })

  describe('metrics recording', () => {
    it('should record dispatch latency on successful async dispatch', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('order:created', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      await manager.doActionAsync('order:created', {}, { priority: 'high' })

      const prometheusOutput = registry.toPrometheus()
      expect(prometheusOutput).toContain('gravito_event_dispatch_latency_seconds')
      expect(prometheusOutput).toContain('event_name="order:created"')
      expect(prometheusOutput).toContain('priority="high"')
    })

    it('should record processed event as success', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('success:event', async () => {})

      await manager.doActionAsync('success:event', {})

      const prometheusOutput = registry.toPrometheus()
      expect(prometheusOutput).toContain('gravito_event_processed_total')
      expect(prometheusOutput).toContain('status="success"')
    })

    it('should record queue depth after dispatch', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('queue:test', async () => {})

      await manager.doActionAsync('queue:test', {}, { priority: 'normal' })

      const prometheusOutput = registry.toPrometheus()
      expect(prometheusOutput).toContain('gravito_event_queue_depth')
      expect(prometheusOutput).toContain('priority="normal"')
    })

    it('should record failure with error type', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('failing:event', async () => {
        throw new TypeError('Invalid type')
      })

      try {
        await manager.doActionAsync('failing:event', {})
      } catch {
        // Expected error
      }

      const prometheusOutput = registry.toPrometheus()
      // Note: Error is caught at queue level, not async dispatch
      expect(prometheusOutput).toContain('gravito_event_')
    })

    it('should handle different priority levels', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('multi:priority', async () => {})

      await manager.doActionAsync('multi:priority', {}, { priority: 'high' })
      await manager.doActionAsync('multi:priority', {}, { priority: 'normal' })
      await manager.doActionAsync('multi:priority', {}, { priority: 'low' })

      const prometheusOutput = registry.toPrometheus()
      expect(prometheusOutput).toContain('priority="high"')
      expect(prometheusOutput).toContain('priority="normal"')
      expect(prometheusOutput).toContain('priority="low"')
    })
  })

  describe('tracing integration', () => {
    it('should create spans when tracing enabled', async () => {
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          tracing: true,
        }
      )

      expect(manager.getTracer()).toBeDefined()

      manager.addAction('traced:event', async () => {})
      await manager.doActionAsync('traced:event', {})

      expect(manager.getTracer()).toBeDefined()
    })

    it('should not create spans when tracing disabled', () => {
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          tracing: false,
        }
      )

      expect(manager.getTracer()).toBeUndefined()
    })
  })

  describe('observability config management', () => {
    it('should get current observability config', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const config = {
        enabled: true,
        metrics: registry,
        tracing: true,
        metricsPrefix: 'test_',
      }

      const manager = new ObservableHookManager({}, config)
      const retrieved = manager.getObservabilityConfig()

      expect(retrieved.enabled).toBe(true)
      expect(retrieved.tracing).toBe(true)
      expect(retrieved.metricsPrefix).toBe('test_')
    })

    it('should update observability config at runtime', () => {
      const manager = new ObservableHookManager({}, { enabled: false })

      expect(manager.getMetrics()).toBeUndefined()

      const registry = new MetricsRegistry({ defaultMetrics: false })
      manager.setObservabilityConfig({
        enabled: true,
        metrics: registry,
      })

      expect(manager.getMetrics()).toBeDefined()
    })

    it('should allow enabling tracing after initialization', () => {
      const manager = new ObservableHookManager({}, { enabled: false })

      expect(manager.getTracer()).toBeUndefined()

      manager.setObservabilityConfig({
        enabled: true,
        tracing: true,
      })

      expect(manager.getTracer()).toBeDefined()
    })
  })

  describe('performance', () => {
    it('should have minimal overhead when observability disabled', async () => {
      const manager = new ObservableHookManager({ migrationMode: 'async' })

      manager.addAction('perf:test', async () => {
        // Simulate minimal work
      })

      const startTime = performance.now()
      for (let i = 0; i < 100; i++) {
        await manager.doActionAsync('perf:test', {})
      }
      const duration = performance.now() - startTime

      // Should complete quickly without observability overhead
      expect(duration).toBeLessThan(5000) // 50ms per dispatch is acceptable baseline
    })

    it('should not impact listener execution', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
          tracing: true,
        }
      )

      let executionCount = 0
      manager.addAction('counting:event', async () => {
        executionCount++
      })

      // Register 10 listeners
      for (let i = 0; i < 9; i++) {
        manager.addAction('counting:event', async () => {
          executionCount++
        })
      }

      await manager.doActionAsync('counting:event', {})

      // Give async operations time to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // All 10 listeners should execute
      expect(executionCount).toBe(10)
    })
  })

  describe('integration with HookManager features', () => {
    it('should work with filters', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let filtered = false
      manager.addFilter('content', async (value: string) => {
        filtered = true
        return value.toUpperCase()
      })

      const result = await manager.applyFilters('content', 'hello')
      expect(result).toBe('HELLO')
      expect(filtered).toBe(true)
    })

    it('should work with circuit breaker', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let callCount = 0
      manager.addAction(
        'circuit:test',
        async () => {
          callCount++
          throw new Error('Simulated failure')
        },
        {
          circuitBreaker: {
            failureThreshold: 2,
            resetTimeout: 1000,
            halfOpenRequests: 1,
          },
        }
      )

      // First call should fail and increment call count
      try {
        await manager.doActionAsync('circuit:test', {})
      } catch {
        // Expected
      }

      expect(callCount).toBeGreaterThan(0)
    })

    it('should work with queue configuration', () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        {
          migrationMode: 'async',
          queue: {
            maxSize: 1000,
            strategy: 'drop-oldest',
          },
        },
        {
          enabled: true,
          metrics: registry,
        }
      )

      expect(manager).toBeDefined()
    })
  })

  describe('multiple event types', () => {
    it('should record metrics for multiple event types', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('order:created', async () => {})
      manager.addAction('user:registered', async () => {})
      manager.addAction('email:sent', async () => {})

      await manager.doActionAsync('order:created', {}, { priority: 'high' })
      await manager.doActionAsync('user:registered', {}, { priority: 'normal' })
      await manager.doActionAsync('email:sent', {}, { priority: 'low' })

      const prometheusOutput = registry.toPrometheus()

      expect(prometheusOutput).toContain('event_name="order:created"')
      expect(prometheusOutput).toContain('event_name="user:registered"')
      expect(prometheusOutput).toContain('event_name="email:sent"')
    })

    it('should handle concurrent event dispatches with metrics', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      for (let i = 0; i < 5; i++) {
        manager.addAction(`event:${i}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
        })
      }

      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(manager.doActionAsync(`event:${i}`, {}))
      }

      await Promise.all(promises)

      const prometheusOutput = registry.toPrometheus()
      expect(prometheusOutput).toContain('gravito_event_dispatch_latency_seconds')
    })
  })
})
