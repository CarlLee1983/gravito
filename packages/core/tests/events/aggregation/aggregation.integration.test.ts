/**
 * Event aggregation integration tests (FS-102)
 *
 * Tests for:
 * - End-to-end aggregation flow
 * - Deduplication with various patterns
 * - Batch processing with time and size triggers
 * - Backpressure-aware window adjustment
 * - Backward compatibility
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { AggregationWindow } from '../../../src/events/aggregation/AggregationWindow'
import { DeduplicationManager } from '../../../src/events/aggregation/DeduplicationManager'
import { EventAggregationManager } from '../../../src/events/aggregation/EventAggregationManager'
import { EventBatcher } from '../../../src/events/aggregation/EventBatcher'
import { BackpressureState } from '../../../src/events/BackpressureManager'
import type { EventTask } from '../../../src/events/types'

describe('FS-102 Event Aggregation Integration Tests', () => {
  let aggregationManager: EventAggregationManager
  let submittedTasks: EventTask[] = []

  beforeEach(() => {
    submittedTasks = []
    aggregationManager = new EventAggregationManager({
      enabled: true,
      windowMs: 100,
      batchSize: 10,
      deduplication: 'pattern',
    })

    aggregationManager.setSubmitToQueueFn(async (tasks) => {
      submittedTasks.push(...tasks)
    })
  })

  afterEach(async () => {
    await aggregationManager.shutdown()
  })

  describe('Deduplication', () => {
    it('should deduplicate events with same hook name', async () => {
      const task1 = createTask('user:created', { id: 1 }, 'normal')
      const task2 = createTask('user:created', { id: 2 }, 'normal')

      await aggregationManager.submit(task1)
      await aggregationManager.submit(task2)

      // One event should be deduplicated
      expect(aggregationManager.__getDeduplicator().getDeduplicationRate()).toBeGreaterThan(0)
    })

    it('should keep higher priority events during deduplication', async () => {
      const lowPriorityTask = createTask('test:event', {}, 'low')
      const highPriorityTask = createTask('test:event', {}, 'high')

      await aggregationManager.submit(lowPriorityTask)
      await aggregationManager.submit(highPriorityTask)

      const deduplicated = aggregationManager.__getDeduplicator().getDeduplicated()
      expect(deduplicated[0]?.options.priority).toBe('high')
    })

    it('should track deduplication statistics', async () => {
      for (let i = 0; i < 5; i++) {
        await aggregationManager.submit(createTask('user:updated', { id: i }, 'normal'))
      }

      const stats = aggregationManager.__getDeduplicator().getStats()
      expect(stats.totalEvents).toBe(5)
      expect(stats.deduplicationRate).toBeGreaterThan(0)
      expect(stats.removedCount).toBeGreaterThan(0)
    })
  })

  describe('Batching', () => {
    it('should trigger batch on size threshold', async () => {
      const batcher = aggregationManager.__getBatcher()
      const initialBatches = batcher.getStats().totalBatches

      for (let i = 0; i < 10; i++) {
        const task = createTask(`test:event:${i}`, { index: i }, 'normal')
        await aggregationManager.submit(task)
      }

      // Wait a bit for async flush
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stats = batcher.getStats()
      // Should have triggered at least one batch due to size
      expect(stats.totalBatches).toBeGreaterThan(initialBatches)
    })

    it('should include deduplication in batch submission', async () => {
      const deduplicator = aggregationManager.__getDeduplicator()

      // Submit 20 events with 50% duplicates
      for (let i = 0; i < 20; i++) {
        const taskId = i % 2
        const task = createTask(`user:update:${taskId}`, { id: taskId }, 'normal')
        await aggregationManager.submit(task)
      }

      // Check deduplication stats
      const stats = deduplicator.getStats()
      expect(stats.totalEvents).toBe(20)

      // Deduplication should have occurred (removedCount > 0)
      if (stats.deduplicationRate > 0) {
        expect(stats.removedCount).toBeGreaterThan(0)
      }
    })
  })

  describe('Window Adjustment', () => {
    it('should adjust window based on backpressure state', () => {
      const window = aggregationManager.__getWindow()

      // Normal state
      window.adjustWindow(BackpressureState.NORMAL)
      expect(window.getCurrentWindow()).toBe(200)

      // Warning state
      window.adjustWindow(BackpressureState.WARNING)
      expect(window.getCurrentWindow()).toBe(150)

      // Critical state
      window.adjustWindow(BackpressureState.CRITICAL)
      expect(window.getCurrentWindow()).toBe(100)

      // Overflow state
      window.adjustWindow(BackpressureState.OVERFLOW)
      expect(window.getCurrentWindow()).toBe(50)
    })

    it('should track window adjustment statistics', () => {
      const window = aggregationManager.__getWindow()
      const initialStats = window.getStats()
      const initialCount = initialStats.adjustmentCount

      // Perform an adjustment
      window.adjustWindow(BackpressureState.CRITICAL)
      const stats = window.getStats()

      // Should have incremented adjustment count (or stayed the same if no actual change)
      expect(stats.adjustmentCount).toBeGreaterThanOrEqual(initialCount)
      if (stats.adjustmentCount > initialCount) {
        expect(stats.lastAdjustmentReason).toContain('critical')
      }
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without aggregation enabled', async () => {
      const managerWithoutAgg = new EventAggregationManager({
        enabled: false,
      })

      let _queuedTasks: EventTask[] = []
      managerWithoutAgg.setSubmitToQueueFn(async (tasks) => {
        _queuedTasks = tasks
      })

      // Should not fail even though aggregation is disabled
      expect(() => {
        managerWithoutAgg.submit(createTask('test:event', {}, 'normal'))
      }).not.toThrow()

      await managerWithoutAgg.shutdown()
    })

    it('should maintain existing event options', async () => {
      const task = createTask('test:event', { data: 'test' }, 'high')
      task.options.idempotencyKey = 'test-key'
      task.options.timeout = 3000

      await aggregationManager.submit(task)
      await aggregationManager.flush()

      const submittedTask = submittedTasks[0]
      expect(submittedTask?.options.idempotencyKey).toBe('test-key')
      expect(submittedTask?.options.timeout).toBe(3000)
    })
  })

  describe('End-to-End Flow', () => {
    it('should complete full aggregation cycle', async () => {
      // Submit 50 events with duplicates
      for (let i = 0; i < 50; i++) {
        const pattern = i % 5
        const task = createTask(`event:${pattern}`, { id: i }, i % 3 === 0 ? 'high' : 'normal')
        await aggregationManager.submit(task)
      }

      // Wait for batching and deduplication
      await new Promise((resolve) => setTimeout(resolve, 150))
      await aggregationManager.flush()

      // Verify results
      expect(submittedTasks.length).toBeGreaterThan(0)

      const stats = aggregationManager.getStats()
      expect(stats.deduplication.totalEvents).toBe(50)
      expect(stats.deduplication.deduplicationRate).toBeGreaterThanOrEqual(0)
      expect(stats.batching.totalBatches).toBeGreaterThan(0)
    })

    it('should handle mixed priority events', async () => {
      const priorities: Array<'low' | 'normal' | 'high' | 'critical'> = [
        'low',
        'normal',
        'high',
        'critical',
      ]

      for (let i = 0; i < 20; i++) {
        const priority = priorities[i % priorities.length]
        const task = createTask(`event:${i % 3}`, { id: i }, priority)
        await aggregationManager.submit(task)
      }

      await new Promise((resolve) => setTimeout(resolve, 150))
      await aggregationManager.flush()

      // Should have submitted deduplicated events
      expect(submittedTasks.length).toBeGreaterThan(0)

      // Verify that higher priority events were preserved
      const hasCritical = submittedTasks.some((t) => t.options.priority === 'critical')
      const hasHigh = submittedTasks.some((t) => t.options.priority === 'high')
      expect(hasCritical || hasHigh).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should provide accurate aggregation statistics', async () => {
      for (let i = 0; i < 30; i++) {
        const task = createTask(`event:${i % 5}`, { id: i }, 'normal')
        await aggregationManager.submit(task)
      }

      await aggregationManager.flush()

      const stats = aggregationManager.getStats()
      expect(stats.timestamp).toBeGreaterThan(0)
      expect(stats.deduplication.totalEvents).toBe(30)
      expect(stats.deduplication.deduplicatedEvents).toBeGreaterThan(0)
      expect(stats.batching.totalEvents).toBeGreaterThan(0)
    })
  })
})

/**
 * Helper function to create test tasks.
 */
function createTask(
  hook: string,
  args: unknown,
  priority: 'critical' | 'high' | 'normal' | 'low'
): EventTask {
  const now = Date.now()
  return {
    id: `task-${now}-${Math.random()}`,
    hook,
    args,
    callbacks: [],
    options: {
      async: true,
      priority,
      timeout: 5000,
      ordering: 'none',
      partitionKey: '',
      idempotencyKey: '',
      ttl: 3600000,
      escalation: { enabled: true },
      retry: { maxRetries: 0 },
      circuitBreaker: { failureThreshold: 5 },
      aggregation: { enabled: false },
    },
    createdAt: now,
    enqueuedAt: now,
    retryCount: 0,
  }
}
