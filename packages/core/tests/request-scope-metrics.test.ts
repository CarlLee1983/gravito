import { describe, expect, it } from 'bun:test'
import { RequestScopeManager } from '../src/Container/RequestScopeManager'
import {
  RequestScopeMetrics,
  RequestScopeMetricsCollector,
  type RequestScopeObserver,
} from '../src/Container/RequestScopeMetrics'

describe('RequestScopeMetrics', () => {
  describe('lifecycle tracking', () => {
    it('records cleanup duration', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupStart()
      // Simulate some work
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i)
      }
      metrics.recordCleanupEnd(3, 2)

      const duration = metrics.getCleanupDuration()
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThan(500) // Should be fast
    })

    it('tracks scope size and cleaned services', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupEnd(5, 3, 0)

      const json = metrics.toJSON()
      expect(json.scopeSize).toBe(5)
      expect(json.servicesCleaned).toBe(3)
      expect(json.errorsOccurred).toBe(0)
    })

    it('records cleanup errors', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupEnd(5, 3, 2)

      const json = metrics.toJSON()
      expect(json.errorsOccurred).toBe(2)
      expect(json.hasErrors).toBe(true)
    })
  })

  describe('slow cleanup detection', () => {
    it('identifies slow cleanups with default threshold', () => {
      const metrics = new RequestScopeMetrics()

      // Simulate slow cleanup
      metrics.recordCleanupStart()
      for (let i = 0; i < 10000000; i++) {
        Math.sqrt(i)
      }
      metrics.recordCleanupEnd(1, 1)

      expect(metrics.isSlowCleanup()).toBe(true)
    })

    it('identifies slow cleanups with custom threshold', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupStart()
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i)
      }
      metrics.recordCleanupEnd(1, 1)

      expect(metrics.isSlowCleanup(0.1)).toBe(true) // Very strict threshold
    })

    it('returns false for fast cleanups', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupStart()
      metrics.recordCleanupEnd(1, 1)

      expect(metrics.isSlowCleanup()).toBe(false)
    })
  })

  describe('JSON serialization', () => {
    it('serializes metrics to JSON', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupStart()
      metrics.recordCleanupEnd(3, 2, 1)

      const json = metrics.toJSON()

      expect(json).toHaveProperty('cleanupDuration')
      expect(json).toHaveProperty('scopeSize', 3)
      expect(json).toHaveProperty('servicesCleaned', 2)
      expect(json).toHaveProperty('errorsOccurred', 1)
      expect(json).toHaveProperty('hasErrors', true)
      expect(json).toHaveProperty('isSlowCleanup')
    })

    it('converts metrics to string format', () => {
      const metrics = new RequestScopeMetrics()

      metrics.recordCleanupStart()
      metrics.recordCleanupEnd(3, 2, 1)

      const str = metrics.toString()

      expect(str).toContain('cleanup:')
      expect(str).toContain('scope: 3')
      expect(str).toContain('cleaned: 2')
      expect(str).toContain('errors: 1')
    })
  })
})

describe('RequestScopeMetricsCollector', () => {
  describe('aggregation', () => {
    it('collects metrics from multiple scopes', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics1 = new RequestScopeMetrics()
      const metrics2 = new RequestScopeMetrics()
      const metrics3 = new RequestScopeMetrics()

      metrics1.recordCleanupEnd(2, 2, 0)
      metrics2.recordCleanupEnd(3, 2, 0)
      metrics3.recordCleanupEnd(5, 4, 1)

      collector.record(metrics1)
      collector.record(metrics2)
      collector.record(metrics3)

      expect(collector.size()).toBe(3)
    })

    it('calculates average cleanup time', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics1 = new RequestScopeMetrics()
      const metrics2 = new RequestScopeMetrics()

      metrics1.recordCleanupStart()
      metrics1.recordCleanupEnd(1, 1, 0)

      metrics2.recordCleanupStart()
      metrics2.recordCleanupEnd(1, 1, 0)

      collector.record(metrics1)
      collector.record(metrics2)

      const stats = collector.getStats()
      expect(stats.count).toBe(2)
      expect(stats.averageCleanupTime).toBeGreaterThan(0)
    })

    it('tracks max and min cleanup times', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics1 = new RequestScopeMetrics()
      const metrics2 = new RequestScopeMetrics()

      metrics1.recordCleanupStart()
      for (let i = 0; i < 5000000; i++) {
        Math.sqrt(i)
      }
      metrics1.recordCleanupEnd(1, 1, 0)

      metrics2.recordCleanupStart()
      metrics2.recordCleanupEnd(1, 1, 0)

      collector.record(metrics1)
      collector.record(metrics2)

      const stats = collector.getStats()
      expect(stats.maxCleanupTime).toBeGreaterThan(stats.minCleanupTime!)
    })

    it('calculates error rate', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics1 = new RequestScopeMetrics()
      const metrics2 = new RequestScopeMetrics()
      const metrics3 = new RequestScopeMetrics()

      metrics1.recordCleanupEnd(1, 1, 0)
      metrics2.recordCleanupEnd(1, 1, 1) // One error
      metrics3.recordCleanupEnd(1, 1, 0)

      collector.record(metrics1)
      collector.record(metrics2)
      collector.record(metrics3)

      const stats = collector.getStats()
      expect(stats.totalErrorCount).toBe(1)
      expect(stats.errorRate).toBeCloseTo(1 / 3)
    })

    it('handles empty collector', () => {
      const collector = new RequestScopeMetricsCollector()

      const stats = collector.getStats()

      expect(stats.count).toBe(0)
      expect(stats.averageCleanupTime).toBeNull()
      expect(stats.maxCleanupTime).toBeNull()
      expect(stats.minCleanupTime).toBeNull()
    })
  })

  describe('management', () => {
    it('clears collected metrics', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics = new RequestScopeMetrics()
      metrics.recordCleanupEnd(1, 1, 0)

      collector.record(metrics)
      expect(collector.size()).toBe(1)

      collector.clear()
      expect(collector.size()).toBe(0)
    })

    it('exports metrics as JSON array', () => {
      const collector = new RequestScopeMetricsCollector()

      const metrics1 = new RequestScopeMetrics()
      const metrics2 = new RequestScopeMetrics()

      metrics1.recordCleanupEnd(1, 1, 0)
      metrics2.recordCleanupEnd(2, 1, 0)

      collector.record(metrics1)
      collector.record(metrics2)

      const json = collector.toJSON()

      expect(Array.isArray(json)).toBe(true)
      expect(json).toHaveLength(2)
      expect(json[0].scopeSize).toBe(1)
      expect(json[1].scopeSize).toBe(2)
    })
  })
})

describe('RequestScopeManager with observer', () => {
  describe('observer lifecycle callbacks', () => {
    it('notifies on service resolution', () => {
      const events: string[] = []

      const observer: RequestScopeObserver = {
        onServiceResolved: (key, isFromCache) => {
          events.push(`resolved:${String(key)}:${isFromCache}`)
        },
      }

      const scope = new RequestScopeManager(observer)

      scope.resolve('service1', () => ({ id: 1 }))
      scope.resolve('service1', () => ({ id: 2 }))
      scope.resolve('service2', () => ({ id: 3 }))

      expect(events).toEqual([
        'resolved:service1:false',
        'resolved:service1:true',
        'resolved:service2:false',
      ])
    })

    it('notifies on cleanup start and end', async () => {
      const events: string[] = []

      const observer: RequestScopeObserver = {
        onCleanupStart: () => events.push('cleanup:start'),
        onCleanupEnd: (metrics) => {
          events.push(`cleanup:end:${metrics.toJSON().scopeSize}`)
        },
      }

      const scope = new RequestScopeManager(observer)
      scope.resolve('service', () => ({ async cleanup() {} }))

      await scope.cleanup()

      expect(events).toEqual(['cleanup:start', 'cleanup:end:1'])
    })

    it('notifies on cleanup errors', async () => {
      const errors: string[] = []

      const observer: RequestScopeObserver = {
        onCleanupError: (error) => {
          errors.push(error.message)
        },
      }

      const scope = new RequestScopeManager(observer)

      scope.resolve('service', () => ({
        async cleanup() {
          throw new Error('Cleanup failed')
        },
      }))

      await scope.cleanup()

      expect(errors).toEqual(['Cleanup failed'])
    })

    it('can set observer after creation', async () => {
      const scope = new RequestScopeManager()
      const events: string[] = []

      const observer: RequestScopeObserver = {
        onServiceResolved: (key) => events.push(`resolved:${String(key)}`),
      }

      scope.setObserver(observer)
      scope.resolve('service', () => ({ id: 1 }))

      expect(events).toEqual(['resolved:service'])
    })
  })

  describe('metrics integration', () => {
    it('provides access to scope metrics', async () => {
      const scope = new RequestScopeManager()

      scope.resolve('service1', () => ({}))
      scope.resolve('service2', () => ({
        async cleanup() {},
      }))

      const metrics = scope.getMetrics()
      expect(metrics).toBeInstanceOf(RequestScopeMetrics)

      await scope.cleanup()

      const json = metrics.toJSON()
      expect(json.scopeSize).toBe(2)
      expect(json.servicesCleaned).toBe(1)
    })

    it('records cleanup metrics accurately', async () => {
      const scope = new RequestScopeManager()

      scope.resolve('service1', () => ({
        async cleanup() {
          for (let i = 0; i < 1000000; i++) {
            Math.sqrt(i)
          }
        },
      }))

      scope.resolve('service2', () => ({
        async cleanup() {},
      }))

      await scope.cleanup()

      const metrics = scope.getMetrics()
      const json = metrics.toJSON()

      expect(json.scopeSize).toBe(2)
      expect(json.servicesCleaned).toBe(2)
      expect(json.errorsOccurred).toBe(0)
      expect(json.cleanupDuration).toBeGreaterThan(0)
    })
  })
})
