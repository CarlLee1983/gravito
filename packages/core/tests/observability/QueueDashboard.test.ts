import { describe, expect, it } from 'bun:test'
import { QueueDashboard, type QueueDashboardConfig } from '../../src/observability/QueueDashboard'

/**
 * Mock EventPriorityQueue
 */
function createMockEventQueue() {
  return {
    getDepth: () => 160,
    getDepthByPriority: (priority: string) => {
      if (priority === 'high') {
        return 10
      }
      if (priority === 'normal') {
        return 50
      }
      if (priority === 'low') {
        return 100
      }
      return 0
    },
    getBackpressureManager: () => ({
      getState: () => 'WARNING',
      getMetrics: () => ({
        state: 'WARNING',
        totalDepth: 160,
        depthByPriority: { high: 10, normal: 50, low: 100 },
        enqueueRate: 42.5,
        rejectedCount: 5,
        degradedCount: 3,
        stateTransitions: 2,
      }),
    }),
    getCircuitBreakers: () => [],
  }
}

/**
 * Mock WorkerPool
 */
function createMockWorkerPool() {
  return {
    config: { workerThreads: 4 },
    getPoolStats: () => ({
      queueDepth: 45,
      utilization: 0.75,
      activeWorkers: 3,
      totalTasksProcessed: 1234,
      totalSuccess: 1215,
      totalFailures: 19,
    }),
    getWorkerStats: () => [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        state: 'busy',
        tasksProcessed: 315,
        tasksSuccess: 310,
        tasksFailed: 5,
        avgDurationMs: 12.3,
        uptime: 3600000,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        state: 'idle',
        tasksProcessed: 310,
        tasksSuccess: 308,
        tasksFailed: 2,
        avgDurationMs: 11.8,
        uptime: 3600000,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        state: 'busy',
        tasksProcessed: 309,
        tasksSuccess: 302,
        tasksFailed: 7,
        avgDurationMs: 13.1,
        uptime: 3600000,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        state: 'idle',
        tasksProcessed: 300,
        tasksSuccess: 295,
        tasksFailed: 5,
        avgDurationMs: 12.0,
        uptime: 3600000,
      },
    ],
  }
}

/**
 * Mock DeadLetterQueue
 */
function createMockDLQ() {
  return {
    list: ({ limit }: { limit?: number }) =>
      [
        {
          id: 'dlq-001',
          eventName: 'user.created',
          error: { message: 'Connection timeout' },
          options: { priority: 'high' },
          firstFailedAt: Date.now() - 3600000,
          retryCount: 3,
        },
        {
          id: 'dlq-002',
          eventName: 'order.submitted',
          error: { message: 'Invalid data' },
          options: { priority: 'normal' },
          firstFailedAt: Date.now() - 1800000,
          retryCount: 1,
        },
        {
          id: 'dlq-003',
          eventName: 'user.updated',
          error: { message: 'Service unavailable' },
          options: { priority: 'low' },
          firstFailedAt: Date.now() - 900000,
          retryCount: 2,
        },
        {
          id: 'dlq-004',
          eventName: 'order.submitted',
          error: { message: 'Duplicate key' },
          options: { priority: 'normal' },
          firstFailedAt: Date.now() - 300000,
          retryCount: 0,
        },
        {
          id: 'dlq-005',
          eventName: 'payment.processed',
          error: { message: 'Rate limit exceeded' },
          options: { priority: 'high' },
          firstFailedAt: Date.now() - 60000,
          retryCount: 5,
        },
      ].slice(0, limit),
    getCount: () => 5,
  }
}

/**
 * Mock HookManager
 */
function createMockHookManager() {
  return {
    getCircuitBreakerStats: () => [
      {
        eventName: 'user.created',
        state: 'CLOSED',
        failureCount: 2,
        successCount: 150,
        totalRequests: 152,
        totalFailures: 2,
        totalSuccesses: 150,
      },
      {
        eventName: 'order.submitted',
        state: 'HALF_OPEN',
        failureCount: 8,
        successCount: 120,
        totalRequests: 128,
        totalFailures: 8,
        totalSuccesses: 120,
      },
      {
        eventName: 'payment.processed',
        state: 'OPEN',
        failureCount: 15,
        successCount: 85,
        totalRequests: 100,
        totalFailures: 15,
        totalSuccesses: 85,
      },
    ],
  }
}

describe('QueueDashboard', () => {
  describe('getQueueMetrics', () => {
    it('should return correct queue metrics with depth and backpressure', () => {
      const config: QueueDashboardConfig = {
        eventQueue: createMockEventQueue() as any,
      }
      const dashboard = new QueueDashboard(config)

      const metrics = dashboard.getQueueMetrics()

      expect(metrics.depth.total).toBe(160)
      expect(metrics.depth.high).toBe(10)
      expect(metrics.depth.normal).toBe(50)
      expect(metrics.depth.low).toBe(100)
      expect(metrics.backpressure.state).toBe('WARNING')
      expect(metrics.backpressure.rejectedCount).toBe(5)
      expect(metrics.backpressure.degradedCount).toBe(3)
      expect(metrics.backpressure.enqueueRate).toBe(42.5)
      expect(metrics.processing).toBe(true)
    })

    it('should return default values when event queue not configured', () => {
      const config: QueueDashboardConfig = {}
      const dashboard = new QueueDashboard(config)

      const metrics = dashboard.getQueueMetrics()

      expect(metrics.depth.total).toBe(0)
      expect(metrics.depth.high).toBe(0)
      expect(metrics.depth.normal).toBe(0)
      expect(metrics.depth.low).toBe(0)
      expect(metrics.backpressure.state).toBe('NORMAL')
      expect(metrics.processing).toBe(false)
    })
  })

  describe('getWorkerMetrics', () => {
    it('should return correct worker pool metrics with success rate calculation', () => {
      const config: QueueDashboardConfig = {
        workerPool: createMockWorkerPool() as any,
      }
      const dashboard = new QueueDashboard(config)

      const metrics = dashboard.getWorkerMetrics()

      expect(metrics.poolSize).toBe(4)
      expect(metrics.activeWorkers).toBe(3)
      expect(metrics.utilization).toBe(0.75)
      expect(metrics.queueDepth).toBe(45)
      expect(metrics.totalProcessed).toBe(1234)
      expect(metrics.totalSuccess).toBe(1215)
      expect(metrics.totalFailures).toBe(19)
      expect(metrics.successRate).toBeCloseTo(0.9846, 3)
      expect(metrics.workers).toHaveLength(4)
    })

    it('should return default values when worker pool not configured', () => {
      const config: QueueDashboardConfig = {}
      const dashboard = new QueueDashboard(config)

      const metrics = dashboard.getWorkerMetrics()

      expect(metrics.poolSize).toBe(0)
      expect(metrics.activeWorkers).toBe(0)
      expect(metrics.utilization).toBe(0)
      expect(metrics.successRate).toBe(1.0)
      expect(metrics.workers).toHaveLength(0)
    })
  })

  describe('getJobTimeline', () => {
    it('should return correct job timeline from DLQ entries', () => {
      const config: QueueDashboardConfig = {
        dlq: createMockDLQ() as any,
      }
      const dashboard = new QueueDashboard(config)

      const timeline = dashboard.getJobTimeline(50)

      expect(timeline).toHaveLength(5)
      expect(timeline[0]).toMatchObject({
        id: 'dlq-001',
        hook: 'user.created',
        status: 'in_dlq',
        priority: 'high',
        error: 'Connection timeout',
        retryCount: 3,
      })
      expect(timeline[1]).toMatchObject({
        hook: 'order.submitted',
        priority: 'normal',
        retryCount: 1,
      })
    })

    it('should return empty timeline when DLQ not configured', () => {
      const config: QueueDashboardConfig = {}
      const dashboard = new QueueDashboard(config)

      const timeline = dashboard.getJobTimeline()

      expect(timeline).toHaveLength(0)
    })

    it('should respect limit parameter', () => {
      const config: QueueDashboardConfig = {
        dlq: createMockDLQ() as any,
      }
      const dashboard = new QueueDashboard(config)

      const timeline = dashboard.getJobTimeline(2)

      expect(timeline).toHaveLength(2)
    })
  })

  describe('getErrorBreakdown', () => {
    it('should return correct error statistics with circuit breaker status', () => {
      const config: QueueDashboardConfig = {
        dlq: createMockDLQ() as any,
        hookManager: createMockHookManager() as any,
      }
      const dashboard = new QueueDashboard(config)

      const errors = dashboard.getErrorBreakdown()

      expect(errors.dlqCount).toBe(5)
      expect(errors.totalErrors).toBe(5 + 2 + 8 + 15)
      expect(errors.byEvent).toEqual({
        'user.created': 1,
        'order.submitted': 2,
        'user.updated': 1,
        'payment.processed': 1,
      })
      expect(errors.circuitBreakers).toHaveLength(3)
      expect(errors.circuitBreakers[0]).toMatchObject({
        eventName: 'user.created',
        state: 'CLOSED',
        failures: 2,
        successes: 150,
      })
      // Verify total failures are summed correctly
      expect(errors.totalErrors).toBe(30)
    })

    it('should return default values when DLQ and HookManager not configured', () => {
      const config: QueueDashboardConfig = {}
      const dashboard = new QueueDashboard(config)

      const errors = dashboard.getErrorBreakdown()

      expect(errors.totalErrors).toBe(0)
      expect(errors.dlqCount).toBe(0)
      expect(errors.byEvent).toEqual({})
      expect(errors.circuitBreakers).toHaveLength(0)
    })
  })

  describe('exportMetrics', () => {
    it('should export metrics in JSON format', () => {
      const config: QueueDashboardConfig = {
        eventQueue: createMockEventQueue() as any,
        workerPool: createMockWorkerPool() as any,
        dlq: createMockDLQ() as any,
        hookManager: createMockHookManager() as any,
      }
      const dashboard = new QueueDashboard(config)

      const json = dashboard.exportMetrics('json')
      const parsed = JSON.parse(json)

      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('queue')
      expect(parsed).toHaveProperty('workers')
      expect(parsed).toHaveProperty('timeline')
      expect(parsed).toHaveProperty('errors')
      expect(parsed.queue.depth.total).toBe(160)
      expect(parsed.workers.totalProcessed).toBe(1234)
    })

    it('should export metrics in Prometheus format', () => {
      const config: QueueDashboardConfig = {
        eventQueue: createMockEventQueue() as any,
        workerPool: createMockWorkerPool() as any,
        dlq: createMockDLQ() as any,
        hookManager: createMockHookManager() as any,
      }
      const dashboard = new QueueDashboard(config)

      const prometheus = dashboard.exportMetrics('prometheus')

      // Check for key Prometheus metrics
      expect(prometheus).toContain('# HELP gravito_queue_depth')
      expect(prometheus).toContain('# TYPE gravito_queue_depth gauge')
      expect(prometheus).toContain('gravito_queue_depth{priority="high"} 10')
      expect(prometheus).toContain('gravito_queue_depth{priority="normal"} 50')
      expect(prometheus).toContain('gravito_queue_depth{priority="low"} 100')
      expect(prometheus).toContain('# HELP gravito_worker_pool_active')
      expect(prometheus).toContain('gravito_worker_pool_active 3')
      expect(prometheus).toContain('# HELP gravito_worker_success_rate')
      expect(prometheus).toContain('gravito_dlq_size 5')
      expect(prometheus).toContain('gravito_circuit_breaker_failures')
      expect(prometheus).toContain('gravito_circuit_breaker_successes')
    })

    it('should properly escape Prometheus labels', () => {
      const config: QueueDashboardConfig = {
        hookManager: {
          getCircuitBreakerStats: () => [
            {
              eventName: 'event"with"quotes',
              state: 'CLOSED',
              failures: 1,
              successes: 10,
            },
            {
              eventName: 'event\\with\\backslash',
              state: 'CLOSED',
              failures: 0,
              successes: 5,
            },
          ],
        } as any,
      }
      const dashboard = new QueueDashboard(config)

      const prometheus = dashboard.exportMetrics('prometheus')

      // Verify escaping
      expect(prometheus).toContain('event\\"with\\"quotes')
      expect(prometheus).toContain('event\\\\with\\\\backslash')
    })
  })

  describe('getSnapshot', () => {
    it('should return complete snapshot with all metrics', () => {
      const config: QueueDashboardConfig = {
        eventQueue: createMockEventQueue() as any,
        workerPool: createMockWorkerPool() as any,
        dlq: createMockDLQ() as any,
        hookManager: createMockHookManager() as any,
      }
      const dashboard = new QueueDashboard(config)

      const snapshot = dashboard.getSnapshot()

      expect(snapshot).toHaveProperty('timestamp')
      expect(typeof snapshot.timestamp).toBe('number')
      expect(snapshot.timestamp).toBeGreaterThan(0)
      expect(snapshot.queue).toBeDefined()
      expect(snapshot.workers).toBeDefined()
      expect(snapshot.timeline).toBeDefined()
      expect(snapshot.errors).toBeDefined()
    })

    it('should respect timelineLimit parameter', () => {
      const config: QueueDashboardConfig = {
        dlq: createMockDLQ() as any,
      }
      const dashboard = new QueueDashboard(config)

      const snapshotDefault = dashboard.getSnapshot()
      const snapshotLimited = dashboard.getSnapshot({ timelineLimit: 2 })

      expect(snapshotDefault.timeline.length).toBeGreaterThanOrEqual(
        snapshotLimited.timeline.length
      )
      expect(snapshotLimited.timeline).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('should handle missing optional properties gracefully', () => {
      const config: QueueDashboardConfig = {
        eventQueue: {
          getDepth: () => 10,
          // Missing getDepthByPriority
          // Missing getBackpressureManager
        } as any,
        workerPool: {
          config: { workerThreads: 2 },
          // Missing getPoolStats
          // Missing getWorkerStats
        } as any,
      }
      const dashboard = new QueueDashboard(config)

      const queueMetrics = dashboard.getQueueMetrics()
      const workerMetrics = dashboard.getWorkerMetrics()

      expect(queueMetrics.depth.total).toBe(10)
      expect(queueMetrics.depth.high).toBe(0)
      expect((workerMetrics as any).poolSize).toBe(2)
      expect(workerMetrics.workers).toHaveLength(0)
    })

    it('should handle zero success rate calculation', () => {
      const config: QueueDashboardConfig = {
        workerPool: {
          config: { workerThreads: 2 },
          getPoolStats: () => ({
            queueDepth: 0,
            utilization: 0,
            activeWorkers: 0,
            totalTasksProcessed: 0,
            totalSuccess: 0,
            totalFailures: 0,
          }),
          getWorkerStats: () => [],
        } as any,
      }
      const dashboard = new QueueDashboard(config)

      const metrics = dashboard.getWorkerMetrics()

      expect(metrics.successRate).toBe(1.0) // Default when no tasks processed
    })
  })
})
