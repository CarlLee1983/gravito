import { afterEach, describe, expect, it } from 'bun:test'
import { BackpressureController } from '../../../../src/drivers/kafka/BackpressureController'
import { ConsumerLifecycleManager } from '../../../../src/drivers/kafka/ConsumerLifecycleManager'
import { ErrorRecoveryManager } from '../../../../src/drivers/kafka/ErrorRecoveryManager'
import { HeartbeatManager } from '../../../../src/drivers/kafka/HeartbeatManager'
import { KafkaMetrics } from '../../../../src/drivers/kafka/KafkaMetrics'
import { PerformanceMonitor } from '../../../../src/drivers/kafka/PerformanceMonitor'

function createBoundMonitor(config?: {
  snapshotIntervalMs?: number
  historySize?: number
  enabled?: boolean
}) {
  const metrics = new KafkaMetrics()
  const errorRecovery = new ErrorRecoveryManager()
  const heartbeat = new HeartbeatManager()
  const backpressure = new BackpressureController(1000)
  const lifecycle = new ConsumerLifecycleManager()

  const monitor = new PerformanceMonitor(config)
  monitor.bind({ metrics, errorRecovery, heartbeat, backpressure, lifecycle })

  return { monitor, metrics, errorRecovery, heartbeat, backpressure, lifecycle }
}

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  afterEach(() => {
    monitor?.destroy()
  })

  describe('constructor and configuration', () => {
    it('should use default configuration', () => {
      monitor = new PerformanceMonitor()
      expect(monitor.isRunning()).toBe(false)
      expect(monitor.getLatestSnapshot()).toBeNull()
    })

    it('should accept custom configuration', () => {
      const ctx = createBoundMonitor({ snapshotIntervalMs: 1000, historySize: 10 })
      monitor = ctx.monitor
      expect(monitor.isRunning()).toBe(false)
    })

    it('should not collect snapshots when disabled', () => {
      const ctx = createBoundMonitor({ enabled: false })
      monitor = ctx.monitor
      monitor.start()
      expect(monitor.isRunning()).toBe(false)
    })
  })

  describe('snapshot collection', () => {
    it('should collect a snapshot with default healthy state', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      const snapshot = monitor.collectSnapshot()

      expect(snapshot.health).toBe('healthy')
      expect(snapshot.circuitState).toBe('CLOSED')
      // heartbeat is not started, so isAlive is false (expected for idle consumer)
      expect(snapshot.heartbeatAlive).toBe(false)
      expect(snapshot.backpressurePaused).toBe(false)
      expect(snapshot.consumerState).toBe('idle')
      expect(snapshot.totalProcessed).toBe(0)
      expect(snapshot.totalFailed).toBe(0)
      expect(snapshot.inFlight).toBe(0)
      expect(snapshot.timestamp).toBeGreaterThan(0)
    })

    it('should reflect metrics throughput and latency', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      ctx.metrics.recordMessage('test-queue', 15)
      ctx.metrics.recordMessage('test-queue', 25)
      ctx.metrics.recordMessage('test-queue', 10)

      const snapshot = monitor.collectSnapshot()

      expect(snapshot.latency.avg).toBeGreaterThan(0)
      expect(snapshot.totalProcessed).toBe(3)
    })

    it('should reflect error counts', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      ctx.metrics.recordError('callback')
      ctx.metrics.recordError('serialization')
      ctx.metrics.recordError('timeout')

      const snapshot = monitor.collectSnapshot()

      expect(snapshot.errors.total).toBe(3)
      expect(snapshot.errors.callback).toBe(1)
      expect(snapshot.errors.serialization).toBe(1)
      expect(snapshot.errors.timeout).toBe(1)
      expect(snapshot.totalFailed).toBe(3)
    })

    it('should reflect circuit breaker state', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      // Trigger circuit open (5 consecutive failures)
      for (let i = 0; i < 5; i++) {
        ctx.errorRecovery.recordFailure(new Error('test'))
      }

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.circuitState).toBe('OPEN')
    })

    it('should reflect backpressure state', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      // Trigger backpressure (buffer > 80% of 1000)
      ctx.backpressure.evaluate(850, ['test-queue'])

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.backpressurePaused).toBe(true)
    })

    it('should work without bound components', () => {
      monitor = new PerformanceMonitor()
      const snapshot = monitor.collectSnapshot()

      expect(snapshot.health).toBe('healthy')
      expect(snapshot.circuitState).toBe('CLOSED')
      expect(snapshot.heartbeatAlive).toBe(true)
      expect(snapshot.totalProcessed).toBe(0)
    })
  })

  describe('health evaluation', () => {
    it('should be healthy when all components are normal', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.health).toBe('healthy')
    })

    it('should be unhealthy when circuit is OPEN', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      for (let i = 0; i < 5; i++) {
        ctx.errorRecovery.recordFailure(new Error('test'))
      }

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.health).toBe('unhealthy')
    })

    it('should be degraded when backpressure is active', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      ctx.backpressure.evaluate(850, ['test-queue'])

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.health).toBe('degraded')
    })

    it('should be degraded when error rate exceeds 5%', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      // 100 processed, 6 failed = 6% error rate
      for (let i = 0; i < 100; i++) {
        ctx.metrics.recordMessage('test-queue', 10)
      }
      for (let i = 0; i < 6; i++) {
        ctx.metrics.recordError('callback')
      }

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.health).toBe('degraded')
    })

    it('should be healthy when error rate is below 5%', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      // 100 processed, 4 failed = 4% error rate
      for (let i = 0; i < 100; i++) {
        ctx.metrics.recordMessage('test-queue', 10)
      }
      for (let i = 0; i < 4; i++) {
        ctx.metrics.recordError('callback')
      }

      const snapshot = monitor.collectSnapshot()
      expect(snapshot.health).toBe('healthy')
    })
  })

  describe('history management', () => {
    it('should maintain history of snapshots', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      monitor.collectSnapshot()
      monitor.collectSnapshot()
      monitor.collectSnapshot()

      const history = monitor.getHistory()
      expect(history.length).toBe(3)
    })

    it('should limit history to configured size', () => {
      const ctx = createBoundMonitor({ historySize: 3 })
      monitor = ctx.monitor

      for (let i = 0; i < 5; i++) {
        monitor.collectSnapshot()
      }

      const history = monitor.getHistory()
      expect(history.length).toBe(3)
    })

    it('should return last N snapshots with count parameter', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      for (let i = 0; i < 5; i++) {
        ctx.metrics.recordMessage('q', i * 10)
        monitor.collectSnapshot()
      }

      const recent = monitor.getHistory(2)
      expect(recent.length).toBe(2)
      // Should be the last 2
      expect(recent[0]?.totalProcessed).toBe(4)
      expect(recent[1]?.totalProcessed).toBe(5)
    })

    it('should return immutable history copies', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      monitor.collectSnapshot()
      const h1 = monitor.getHistory()
      const h2 = monitor.getHistory()

      expect(h1).not.toBe(h2)
      expect(h1.length).toBe(h2.length)
    })

    it('should return latest snapshot', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      expect(monitor.getLatestSnapshot()).toBeNull()

      monitor.collectSnapshot()
      const latest = monitor.getLatestSnapshot()
      expect(latest).not.toBeNull()
      expect(latest?.timestamp).toBeGreaterThan(0)
    })
  })

  describe('events', () => {
    it('should emit snapshot event on collection', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      const events: any[] = []
      monitor.on('snapshot', (s) => events.push(s))

      monitor.collectSnapshot()

      expect(events.length).toBe(1)
      expect(events[0].health).toBe('healthy')
    })

    it('should emit health:changed when health transitions', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      const changes: any[] = []
      monitor.on('health:changed', (e) => changes.push(e))

      // Collect healthy snapshot first
      monitor.collectSnapshot()
      expect(changes.length).toBe(0) // No change from initial 'healthy'

      // Trigger circuit OPEN -> unhealthy
      for (let i = 0; i < 5; i++) {
        ctx.errorRecovery.recordFailure(new Error('test'))
      }
      monitor.collectSnapshot()

      expect(changes.length).toBe(1)
      expect(changes[0].previous).toBe('healthy')
      expect(changes[0].current).toBe('unhealthy')
    })

    it('should not emit health:changed when health stays the same', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      const changes: any[] = []
      monitor.on('health:changed', (e) => changes.push(e))

      monitor.collectSnapshot()
      monitor.collectSnapshot()
      monitor.collectSnapshot()

      expect(changes.length).toBe(0)
    })
  })

  describe('report generation', () => {
    it('should return message when no snapshots exist', () => {
      monitor = new PerformanceMonitor()
      const report = monitor.generateReport()
      expect(report).toBe('No snapshots collected yet.')
    })

    it('should generate a formatted report', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      ctx.metrics.recordMessage('test-queue', 15)
      ctx.metrics.recordMessage('test-queue', 25)
      monitor.collectSnapshot()

      const report = monitor.generateReport()

      expect(report).toContain('Kafka Performance Report')
      expect(report).toContain('Health: HEALTHY')
      expect(report).toContain('Total Processed: 2')
      expect(report).toContain('Circuit: CLOSED')
      expect(report).toContain('Heartbeat Alive: false')
      expect(report).toContain('Backpressure Paused: false')
    })
  })

  describe('lifecycle', () => {
    it('should start and stop correctly', async () => {
      const ctx = createBoundMonitor({ snapshotIntervalMs: 50 })
      monitor = ctx.monitor

      expect(monitor.isRunning()).toBe(false)

      monitor.start()
      expect(monitor.isRunning()).toBe(true)

      // Wait for at least one interval
      await new Promise((r) => setTimeout(r, 120))

      const history = monitor.getHistory()
      expect(history.length).toBeGreaterThanOrEqual(1)

      monitor.stop()
      expect(monitor.isRunning()).toBe(false)
    })

    it('should be idempotent for start/stop', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      monitor.start()
      monitor.start() // Double start
      expect(monitor.isRunning()).toBe(true)

      monitor.stop()
      monitor.stop() // Double stop
      expect(monitor.isRunning()).toBe(false)
    })

    it('should clean up on destroy', () => {
      const ctx = createBoundMonitor()
      monitor = ctx.monitor

      monitor.start()
      monitor.collectSnapshot()
      monitor.collectSnapshot()

      monitor.destroy()

      expect(monitor.isRunning()).toBe(false)
      expect(monitor.getHistory().length).toBe(0)
      expect(monitor.getLatestSnapshot()).toBeNull()
    })
  })
})
