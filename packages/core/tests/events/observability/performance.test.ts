import { describe, expect, it } from 'bun:test'
import { MetricsRegistry } from '@gravito/monitor'
import { ObservableHookManager } from '../../../src/events/observability/ObservableHookManager'

describe('Observable Event System Performance', () => {
  describe('overhead verification', () => {
    it('should have minimal overhead when observability is disabled', async () => {
      const manager = new ObservableHookManager({ migrationMode: 'async' })

      let execCount = 0
      manager.addAction('perf:test', async () => {
        execCount++
      })

      const startTime = performance.now()
      for (let i = 0; i < 50; i++) {
        await manager.doActionAsync('perf:test', {})
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      const duration = performance.now() - startTime

      expect(execCount).toBeGreaterThanOrEqual(50)
      // With observability disabled, should be fast (50 dispatches + processing)
      expect(duration).toBeLessThan(10000)
    })

    it('should have acceptable overhead when metrics enabled', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      let execCount = 0
      manager.addAction('perf:metrics', async () => {
        execCount++
      })

      const startTime = performance.now()
      for (let i = 0; i < 50; i++) {
        await manager.doActionAsync('perf:metrics', {})
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      const duration = performance.now() - startTime

      expect(execCount).toBeGreaterThanOrEqual(50)
      // With metrics enabled, should still complete in reasonable time
      expect(duration).toBeLessThan(15000)
    })

    it('should have acceptable overhead with both metrics and tracing', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
          tracing: true,
        }
      )

      let execCount = 0
      manager.addAction('perf:both', async () => {
        execCount++
      })

      const startTime = performance.now()
      for (let i = 0; i < 50; i++) {
        await manager.doActionAsync('perf:both', {})
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      const duration = performance.now() - startTime

      expect(execCount).toBeGreaterThanOrEqual(50)
      // Even with both enabled, should be acceptable
      expect(duration).toBeLessThan(20000)
    })
  })

  describe('listener execution performance', () => {
    it('should not impact listener execution time', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      const listeners = 10

      for (let i = 0; i < listeners; i++) {
        manager.addAction('perf:listeners', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
        })
      }

      const startTime = performance.now()
      await manager.doActionAsync('perf:listeners', {})
      await new Promise((resolve) => setTimeout(resolve, 150))

      const totalTime = performance.now() - startTime

      // Metrics collection should not significantly increase total time
      expect(totalTime).toBeLessThan(5000)
    })
  })

  describe('metric collection scalability', () => {
    it('should handle large number of unique events efficiently', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      const numEvents = 50
      for (let i = 0; i < numEvents; i++) {
        manager.addAction(`event:${i}`, async () => {})
      }

      const startTime = performance.now()

      // Dispatch events
      for (let i = 0; i < numEvents; i++) {
        await manager.doActionAsync(`event:${i}`, {})
      }

      // Wait for all to process
      await new Promise((resolve) => setTimeout(resolve, 200))

      const duration = performance.now() - startTime

      // Should scale linearly with number of events
      expect(duration).toBeLessThan(10000)

      const prometheus = registry.toPrometheus()
      expect(prometheus.length).toBeGreaterThan(100)
    })

    it('should handle high cardinality labels efficiently', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('multi:label', async () => {})

      const startTime = performance.now()

      // Dispatch with varying priorities and event attributes
      const priorities = ['high', 'normal', 'low']
      for (let i = 0; i < 10; i++) {
        for (const priority of priorities) {
          await manager.doActionAsync(`multi:label`, { index: i }, { priority: priority as any })
        }
      }

      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(10000)

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('priority="high"')
      expect(prometheus).toContain('priority="normal"')
      expect(prometheus).toContain('priority="low"')
    })
  })

  describe('toggle performance', () => {
    it('should have no performance cost when toggling observability on/off', async () => {
      const manager = new ObservableHookManager({ migrationMode: 'async' })

      manager.addAction('toggle:test', async () => {})

      // Run without observability
      const withoutStart = performance.now()
      for (let i = 0; i < 50; i++) {
        await manager.doActionAsync('toggle:test', {})
      }
      const withoutTime = performance.now() - withoutStart

      // Enable observability
      const registry = new MetricsRegistry({ defaultMetrics: false })
      manager.setObservabilityConfig({
        enabled: true,
        metrics: registry,
      })

      // Run with observability
      const withStart = performance.now()
      for (let i = 0; i < 50; i++) {
        await manager.doActionAsync('toggle:test', {})
      }
      const withTime = performance.now() - withStart

      // Both should complete in reasonable time
      expect(withoutTime).toBeLessThan(5000)
      expect(withTime).toBeLessThan(10000)
    })
  })

  describe('concurrent dispatch performance', () => {
    it('should handle concurrent event dispatches efficiently', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      const numConcurrent = 20
      for (let i = 0; i < numConcurrent; i++) {
        manager.addAction(`concurrent:${i % 5}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }

      const startTime = performance.now()

      const promises = []
      for (let i = 0; i < numConcurrent; i++) {
        promises.push(manager.doActionAsync(`concurrent:${i % 5}`, {}))
      }

      await Promise.all(promises)

      // Wait for all background processing
      await new Promise((resolve) => setTimeout(resolve, 300))

      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(10000)

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('dispatch_latency_seconds')
    })
  })

  describe('memory efficiency', () => {
    it('should not leak memory with repeated metric collection', async () => {
      const registry = new MetricsRegistry({ defaultMetrics: false })
      const manager = new ObservableHookManager(
        { migrationMode: 'async' },
        {
          enabled: true,
          metrics: registry,
        }
      )

      manager.addAction('memory:test', async () => {})

      const memoryBefore = process.memoryUsage().heapUsed

      // Run many iterations
      for (let i = 0; i < 1000; i++) {
        await manager.doActionAsync('memory:test', {})
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const memoryAfter = process.memoryUsage().heapUsed
      const memoryIncrease = memoryAfter - memoryBefore

      // Memory increase should be reasonable (< 10MB for 1000 dispatches)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)

      const prometheus = registry.toPrometheus()
      expect(prometheus).toContain('memory:test')
    })
  })
})
