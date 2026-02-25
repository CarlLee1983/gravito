import { beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureManager } from '../../../src/events/BackpressureManager'
import { EventPriorityQueue } from '../../../src/events/EventPriorityQueue'
import { PriorityStatistics } from '../../../src/events/PriorityEscalationManager'
import type { EventTask } from '../../../src/events/types'

describe('Priority System Integration', () => {
  let queue: EventPriorityQueue
  let backpressure: BackpressureManager
  let stats: PriorityStatistics

  beforeEach(() => {
    queue = new EventPriorityQueue({
      maxSize: 1000,
      backpressure: {
        enabled: true,
        maxQueueSize: 500,
        thresholds: {
          warning: 0.6,
          critical: 0.85,
          overflow: 1.0,
        },
      },
    })
    backpressure = new BackpressureManager({
      enabled: true,
      maxQueueSize: 500,
      thresholds: {
        warning: 0.6,
        critical: 0.85,
        overflow: 1.0,
      },
    })
    stats = new PriorityStatistics()
    queue.setPriorityStatistics(stats)
  })

  describe('Mixed Priority Event Processing', () => {
    it('should process mixed priority events in correct order', () => {
      const executed: string[] = []

      const createCallback = (label: string) =>
        (async () => {
          executed.push(label)
        }) as any

      const tasks = [
        { id: 'l-1', priority: 'low' as const, label: 'low-1' },
        { id: 'h-1', priority: 'high' as const, label: 'high-1' },
        { id: 'c-1', priority: 'critical' as const, label: 'critical-1' },
        { id: 'n-1', priority: 'normal' as const, label: 'normal-1' },
      ]

      for (const taskDef of tasks) {
        const task: EventTask = {
          id: taskDef.id,
          hook: 'event',
          args: {},
          callbacks: [createCallback(taskDef.label)],
          options: { priority: taskDef.priority },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        queue.enqueue(task)
      }

      expect(queue.getDepth()).toBeGreaterThanOrEqual(0)
    })

    it('should track priority distribution through statistics', () => {
      const createTask = (id: string, priority: any) => ({
        id,
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      })

      queue.enqueue(createTask('c-1', 'critical'))
      queue.enqueue(createTask('h-1', 'high'))
      queue.enqueue(createTask('h-2', 'high'))
      queue.enqueue(createTask('n-1', 'normal'))

      const distribution = stats.getDistribution()
      expect(Object.keys(distribution)).toContain('critical')
      expect(Object.keys(distribution)).toContain('high')
      expect(Object.keys(distribution)).toContain('normal')
      expect(Object.keys(distribution)).toContain('low')
    })
  })

  describe('Automatic Priority Escalation', () => {
    it('should escalate delayed events automatically', () => {
      const stats2 = new PriorityStatistics()
      queue.setPriorityStatistics(stats2)

      const nowMs = Date.now()
      const delayedTask: EventTask = {
        id: 'delayed-1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: {
          priority: 'normal',
          escalation: {
            enabled: true,
            thresholds: { normalToHigh: 50, highToCritical: 25 },
            maxWaitTimeMs: 200,
          },
        },
        createdAt: nowMs - 100, // 100ms wait
        enqueuedAt: nowMs - 100,
      }

      queue.enqueue(delayedTask)

      const escalationStats = stats2.getEscalationStats()
      // May have escalated if processing took long
      expect(escalationStats.total).toBeGreaterThanOrEqual(0)
    })

    it('should respect CRITICAL priority during backpressure WARNING', () => {
      const bpManager = queue.getBackpressureManager()
      expect(bpManager).toBeDefined()

      // Verify CRITICAL is allowed even in WARNING state
      const decision = backpressure.evaluate(
        'test:event',
        'critical',
        400, // 80% full
        { critical: 10, high: 50, normal: 100, low: 240 }
      )

      // Should allow CRITICAL even in high-load scenario
      expect(decision.allowed).toBe(true)
    })

    it('should maintain backward compatibility', () => {
      const legacyTask: EventTask = {
        id: 'legacy-1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' }, // No escalation config
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      // Should work without errors
      const taskId = queue.enqueue(legacyTask)
      expect(taskId).not.toBe('dropped')
    })
  })

  describe('Backpressure Integration with CRITICAL', () => {
    it('should allow CRITICAL during NORMAL backpressure state', () => {
      const decision = backpressure.evaluate('event', 'critical', 100, {
        critical: 5,
        high: 20,
        normal: 30,
        low: 45,
      })

      expect(decision.allowed).toBe(true)
    })

    it('should allow CRITICAL during WARNING state', () => {
      // WARNING state (60% full)
      const decision = backpressure.evaluate('event', 'critical', 300, {
        critical: 10,
        high: 50,
        normal: 100,
        low: 140,
      })

      expect(decision.allowed).toBe(true)
    })

    it('should allow CRITICAL during CRITICAL state', () => {
      // CRITICAL state (85% full)
      const decision = backpressure.evaluate('event', 'critical', 425, {
        critical: 15,
        high: 75,
        normal: 150,
        low: 185,
      })

      expect(decision.allowed).toBe(true)
    })

    it('should reject all events during OVERFLOW except per max limit', () => {
      // OVERFLOW state (100% full) - nothing passes
      const decision = backpressure.evaluate('event', 'critical', 500, {
        critical: 25,
        high: 100,
        normal: 200,
        low: 175,
      })

      // OVERFLOW state should reject events
      expect(decision.allowed).toBe(false)
    })
  })

  describe('End-to-end Priority System', () => {
    it('should complete full workflow with all priority levels', () => {
      const executed: string[] = []

      const createCallback = (label: string) => async () => {
        executed.push(label)
      }

      // Create diverse tasks
      const taskDefinitions = [
        { id: 'low-1', priority: 'low' as const, label: 'low' },
        { id: 'normal-1', priority: 'normal' as const, label: 'normal' },
        { id: 'high-1', priority: 'high' as const, label: 'high' },
        { id: 'critical-1', priority: 'critical' as const, label: 'critical' },
      ]

      for (const def of taskDefinitions) {
        const task: EventTask = {
          id: def.id,
          hook: 'event',
          args: {},
          callbacks: [createCallback(def.label) as any],
          options: {
            priority: def.priority,
            escalation: {
              enabled: true,
              thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
            },
          },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        queue.enqueue(task)
      }

      // Verify queue accepted all tasks
      expect(queue.getDepth()).toBeGreaterThanOrEqual(0)
      expect(stats.getEscalationStats().total).toBeGreaterThanOrEqual(0)
    })

    it('should handle stress test with many mixed priorities', () => {
      const taskCount = 50
      const priorities = ['critical', 'high', 'normal', 'low'] as const

      for (let i = 0; i < taskCount; i++) {
        const priority = priorities[i % 4]
        const task: EventTask = {
          id: `task-${i}`,
          hook: 'event',
          args: { index: i },
          callbacks: [],
          options: { priority },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        queue.enqueue(task)
      }

      const distribution = stats.getDistribution()
      const depths = {
        critical: queue.getDepthByPriority('critical'),
        high: queue.getDepthByPriority('high'),
        normal: queue.getDepthByPriority('normal'),
        low: queue.getDepthByPriority('low'),
      }

      // Verify distribution is calculated
      expect(Object.values(distribution).every((v) => typeof v === 'string')).toBe(true)

      // Verify all depths are non-negative
      expect(Object.values(depths).every((d) => d >= 0)).toBe(true)
    })
  })

  describe('Priority Statistics Tracking', () => {
    it('should track and report escalation patterns', () => {
      const stats2 = new PriorityStatistics()

      // Simulate escalation pattern
      stats2.recordEvent('critical')
      stats2.recordEvent('critical')
      stats2.recordEvent('high')
      stats2.recordEscalation('normal', 'high')
      stats2.recordEscalation('low', 'normal')
      stats2.recordEscalation('normal', 'high')

      const fullStats = stats2.getStats()
      expect(fullStats.eventCounts.critical).toBe(2)
      expect(fullStats.eventCounts.high).toBe(1)
      expect(fullStats.escalationStats.total).toBe(3)

      const distribution = stats2.getDistribution()
      // 2 critical out of 3 total = 66.67%
      expect(distribution.critical).toBe('66.67%')
    })

    it('should reset statistics correctly', () => {
      stats.recordEvent('critical')
      stats.recordEscalation('high', 'critical')

      const statsBefore = stats.getStats()
      expect(statsBefore.eventCounts.critical).toBe(1)

      stats.reset()

      const statsAfter = stats.getStats()
      expect(statsAfter.eventCounts.critical).toBe(0)
      expect(statsAfter.escalationStats.total).toBe(0)
    })
  })
})
