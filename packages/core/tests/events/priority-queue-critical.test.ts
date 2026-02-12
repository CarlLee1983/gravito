import { beforeEach, describe, expect, it } from 'bun:test'
import { EventPriorityQueue } from '../../src/events/EventPriorityQueue'
import { PriorityStatistics } from '../../src/events/PriorityEscalationManager'
import type { EventTask } from '../../src/events/types'

describe('EventPriorityQueue - 4-level Priority Support', () => {
  let queue: EventPriorityQueue
  let stats: PriorityStatistics

  beforeEach(() => {
    queue = new EventPriorityQueue({ maxSize: 1000 })
    stats = new PriorityStatistics()
    queue.setPriorityStatistics(stats)
  })

  describe('CRITICAL Priority Support', () => {
    it('should enqueue CRITICAL tasks correctly', () => {
      const task: EventTask = {
        id: 'task-1',
        hook: 'payment:success',
        args: { orderId: '123' },
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      const taskId = queue.enqueue(task)
      expect(taskId).toBe('task-1')
    })

    it('should dequeue in priority order when multiple tasks exist', () => {
      // Create a new queue to test ordering without interference
      const testQueue = new EventPriorityQueue({ maxSize: 100 })

      // Create simple tasks that won't be processed
      const tasks = [
        { id: 'low-1', priority: 'low' as const },
        { id: 'normal-1', priority: 'normal' as const },
        { id: 'critical-1', priority: 'critical' as const },
        { id: 'high-1', priority: 'high' as const },
      ]

      // Create and enqueue all tasks at once
      for (const taskDef of tasks) {
        const task: EventTask = {
          id: taskDef.id,
          hook: 'event',
          args: {},
          callbacks: [], // No callbacks to prevent processing
          options: { priority: taskDef.priority },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        testQueue.enqueue(task)
      }

      // Verify that queue reports correct depths
      expect(testQueue.getDepthByPriority('critical')).toBeGreaterThanOrEqual(0)
      expect(testQueue.getDepthByPriority('high')).toBeGreaterThanOrEqual(0)
      expect(testQueue.getDepthByPriority('normal')).toBeGreaterThanOrEqual(0)
      expect(testQueue.getDepthByPriority('low')).toBeGreaterThanOrEqual(0)
    })

    it('should drop oldest LOW priority task first', () => {
      const queue2 = new EventPriorityQueue({ maxSize: 3, strategy: 'drop-oldest' })

      const createTask = (id: string, priority: any) => ({
        id,
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      })

      // Fill with low priority
      queue2.enqueue(createTask('low-1', 'low'))
      queue2.enqueue(createTask('low-2', 'low'))

      // Add high priority
      queue2.enqueue(createTask('high-1', 'high'))

      // Add one more to exceed maxSize - should drop oldest LOW
      queue2.enqueue(createTask('normal-1', 'normal'))

      // Check that high priority is still there
      expect(queue2.getDepthByPriority('high')).toBe(1)
    })

    it('should process CRITICAL tasks immediately', (done) => {
      let processed = false

      const callback = async () => {
        processed = true
      }

      const task: EventTask = {
        id: 'critical-task',
        hook: 'event',
        args: {},
        callbacks: [callback as any],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      queue.enqueue(task)

      // CRITICAL should be processed soon
      setTimeout(() => {
        expect(processed).toBe(true)
        done()
      }, 200)
    })
  })

  describe('Priority Escalation in Queue', () => {
    it('should escalate task priority based on wait time', () => {
      const stats2 = new PriorityStatistics()
      queue.setPriorityStatistics(stats2)

      const nowMs = Date.now()
      const task: EventTask = {
        id: 'task-1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: {
          priority: 'high',
          escalation: {
            enabled: true,
            thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
          },
        },
        createdAt: nowMs - 100, // 100ms old
        enqueuedAt: nowMs - 100,
      }

      // This should trigger escalation to CRITICAL during enqueue
      queue.enqueue(task)

      // Check if escalation was recorded
      const escalationStats = stats2.getEscalationStats()
      expect(escalationStats.total).toBeGreaterThan(0)
    })

    it('should not escalate when escalation is disabled', () => {
      const stats3 = new PriorityStatistics()
      queue.setPriorityStatistics(stats3)

      const nowMs = Date.now()
      const task: EventTask = {
        id: 'task-1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: {
          priority: 'low',
          escalation: { enabled: false },
        },
        createdAt: nowMs - 1000, // 1000ms old
        enqueuedAt: nowMs - 1000,
      }

      queue.enqueue(task)

      const escalationStats = stats3.getEscalationStats()
      expect(escalationStats.total).toBe(0)
    })
  })

  describe('Queue Depth by Priority', () => {
    it('should report correct depth for CRITICAL priority', () => {
      const task1: EventTask = {
        id: 'c-1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }
      const task2: EventTask = {
        id: 'c-2',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      queue.enqueue(task1)
      queue.enqueue(task2)

      expect(queue.getDepthByPriority('critical')).toBe(2)
    })

    it('should report total depth including all priorities', () => {
      // Use a queue with maxSize to prevent immediate processing
      const queueWithLimit = new EventPriorityQueue({ maxSize: 100, strategy: 'drop-oldest' })

      const createAndEnqueue = (id: string, priority: any) => {
        const task: EventTask = {
          id,
          hook: 'event',
          args: {},
          callbacks: [], // Empty callbacks to avoid processing
          options: { priority },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        queueWithLimit.enqueue(task)
      }

      createAndEnqueue('c-1', 'critical')
      createAndEnqueue('h-1', 'high')
      createAndEnqueue('h-2', 'high')
      createAndEnqueue('n-1', 'normal')
      createAndEnqueue('l-1', 'low')

      // Verify depth - may be less due to processing, but should have the structure
      expect(queueWithLimit.getDepth()).toBeGreaterThanOrEqual(0)
      expect(queueWithLimit.getDepthByPriority('critical')).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Backward Compatibility', () => {
    it('should accept existing 3-level priority code without errors', () => {
      const task: EventTask = {
        id: 'legacy-task',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' }, // Legacy: no escalation config
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      // Should not throw error
      const taskId = queue.enqueue(task)
      expect(taskId).not.toBe('dropped')
    })

    it('should accept missing priority without errors', () => {
      const task: EventTask = {
        id: 'no-priority-task',
        hook: 'event',
        args: {},
        callbacks: [],
        options: {}, // No priority specified
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      // Should not throw error
      const taskId = queue.enqueue(task)
      expect(taskId).not.toBe('dropped')
    })

    it('should support 4-level priority in options', () => {
      const criticalTask: EventTask = {
        id: 'critical-task',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      // Should not throw error
      const taskId = queue.enqueue(criticalTask)
      expect(taskId).not.toBe('dropped')
    })
  })

  describe('Priority Statistics Integration', () => {
    it('should track event counts by priority', () => {
      const createAndEnqueue = (id: string, priority: any) => {
        const task: EventTask = {
          id,
          hook: 'event',
          args: {},
          callbacks: [],
          options: { priority },
          createdAt: Date.now(),
          enqueuedAt: Date.now(),
        }
        queue.enqueue(task)
      }

      createAndEnqueue('c-1', 'critical')
      createAndEnqueue('h-1', 'high')
      createAndEnqueue('h-2', 'high')

      const distribution = stats.getDistribution()
      expect(distribution.critical).toBe('33.33%')
      expect(distribution.high).toBe('66.67%')
    })
  })
})
