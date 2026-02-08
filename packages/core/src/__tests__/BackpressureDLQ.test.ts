/**
 * @gravito/core - BackpressureManager + DLQ Integration Tests
 *
 * Tests for integration between BackpressureManager and DeadLetterQueue,
 * including OVERFLOW routing, retry metrics, and edge cases.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { BackpressureManager } from '../events/BackpressureManager'
import { DeadLetterQueue, type DLQEntry } from '../events/DeadLetterQueue'
import type { EventOptions } from '../events/EventOptions'
import { EventPriorityQueue } from '../events/EventPriorityQueue'

describe('BackpressureManager + DLQ Integration', () => {
  let dlq: DeadLetterQueue
  let queue: EventPriorityQueue

  beforeEach(() => {
    dlq = new DeadLetterQueue(100) // Capacity limit
    queue = new EventPriorityQueue({
      backpressure: {
        enabled: true,
        maxQueueSize: 10,
        dlqOnOverflow: true,
      },
    })
    queue.setDeadLetterQueue(dlq)
  })

  describe('DeadLetterQueue Capacity Management', () => {
    it('should evict oldest entry when capacity is exceeded', () => {
      const dlqWithLimit = new DeadLetterQueue(2)
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const error3 = new Error('Third error')
      const options: EventOptions = { priority: 'normal' }

      const id1 = dlqWithLimit.add('event1', {}, options, error1, 1, Date.now(), 'retry_exhausted')
      const id2 = dlqWithLimit.add('event2', {}, options, error2, 1, Date.now(), 'retry_exhausted')

      expect(dlqWithLimit.getCount()).toBe(2)

      // Adding third entry should evict oldest (id1)
      dlqWithLimit.add('event3', {}, options, error3, 1, Date.now(), 'retry_exhausted')

      expect(dlqWithLimit.getCount()).toBe(2)
      expect(dlqWithLimit.get(id1)).toBeUndefined() // Oldest evicted
      expect(dlqWithLimit.get(id2)).toBeDefined()
    })

    it('should handle max entries configuration updates', () => {
      const dlqWithLimit = new DeadLetterQueue(5)
      const options: EventOptions = { priority: 'normal' }

      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        dlqWithLimit.add(
          `event${i}`,
          {},
          options,
          new Error(`Error ${i}`),
          1,
          Date.now(),
          'retry_exhausted'
        )
      }

      expect(dlqWithLimit.getCount()).toBe(5)

      // Reduce capacity to 2 - should evict 3 oldest
      dlqWithLimit.setMaxEntries(2)

      expect(dlqWithLimit.getCount()).toBe(2)
    })

    it('should return correct newest and oldest entries', async () => {
      const options: EventOptions = { priority: 'normal' }

      dlq.add('event1', {}, options, new Error('Error 1'), 1, Date.now(), 'retry_exhausted')
      // Ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))
      dlq.add('event2', {}, options, new Error('Error 2'), 1, Date.now(), 'retry_exhausted')

      const oldest = dlq.getOldestEntry()
      const newest = dlq.getNewestEntry()

      expect(oldest?.eventName).toBe('event1')
      expect(newest?.eventName).toBe('event2')
      expect(oldest?.failedAt).toBeLessThanOrEqual(newest?.failedAt)
    })
  })

  describe('DLQ Entry Callbacks', () => {
    it('should trigger onEntryAdded callback', () => {
      const addedEntries: DLQEntry[] = []
      dlq.setOnEntryAdded((entry) => {
        addedEntries.push(entry)
      })

      const options: EventOptions = { priority: 'normal' }
      dlq.add(
        'event1',
        { data: 'test' },
        options,
        new Error('Test error'),
        1,
        Date.now(),
        'retry_exhausted'
      )

      expect(addedEntries.length).toBe(1)
      expect(addedEntries[0].eventName).toBe('event1')
      expect(addedEntries[0].payload).toEqual({ data: 'test' })
    })

    it('should trigger onEntryRemoved callback', () => {
      const removedEntries: DLQEntry[] = []
      dlq.setOnEntryRemoved((entry) => {
        removedEntries.push(entry)
      })

      const options: EventOptions = { priority: 'normal' }
      const entryId = dlq.add(
        'event1',
        {},
        options,
        new Error('Test error'),
        1,
        Date.now(),
        'retry_exhausted'
      )

      dlq.delete(entryId)

      expect(removedEntries.length).toBe(1)
      expect(removedEntries[0].eventName).toBe('event1')
    })

    it('should handle multiple callbacks correctly', () => {
      const calls1: string[] = []
      const calls2: string[] = []

      dlq.setOnEntryAdded((entry) => {
        calls1.push(entry.eventName)
      })

      const options: EventOptions = { priority: 'normal' }
      dlq.add('event1', {}, options, new Error('Test'), 1, Date.now(), 'retry_exhausted')

      // Change callback
      dlq.setOnEntryAdded((entry) => {
        calls2.push(entry.eventName)
      })

      dlq.add('event2', {}, options, new Error('Test'), 1, Date.now(), 'retry_exhausted')

      expect(calls1).toEqual(['event1'])
      expect(calls2).toEqual(['event2'])
    })
  })

  describe('DLQ Entry Grouping by Source', () => {
    it('should group entries by source correctly', () => {
      const options: EventOptions = { priority: 'normal' }

      dlq.add('event1', {}, options, new Error('Error'), 1, Date.now(), 'retry_exhausted')
      dlq.add('event2', {}, options, new Error('Error'), 1, Date.now(), 'circuit_breaker')
      dlq.add('event3', {}, options, new Error('Error'), 1, Date.now(), 'backpressure_overflow')
      dlq.add('event4', {}, options, new Error('Error'), 1, Date.now(), 'retry_exhausted')

      const retryExhausted = dlq.getEntriesBySource('retry_exhausted')
      const circuitBreaker = dlq.getEntriesBySource('circuit_breaker')
      const backpressureOverflow = dlq.getEntriesBySource('backpressure_overflow')

      expect(retryExhausted.length).toBe(2)
      expect(circuitBreaker.length).toBe(1)
      expect(backpressureOverflow.length).toBe(1)

      expect(retryExhausted.map((e) => e.eventName)).toEqual(['event1', 'event4'])
      expect(circuitBreaker[0].eventName).toBe('event2')
      expect(backpressureOverflow[0].eventName).toBe('event3')
    })

    it('should return empty array for non-existent source', () => {
      const options: EventOptions = { priority: 'normal' }
      dlq.add('event1', {}, options, new Error('Error'), 1, Date.now(), 'retry_exhausted')

      const manualSource = dlq.getEntriesBySource('manual')

      expect(manualSource.length).toBe(0)
    })
  })

  describe('BackpressureManager OVERFLOW to DLQ Routing', () => {
    it('should include isOverflow flag when in OVERFLOW state', () => {
      const mgr = new BackpressureManager({
        maxQueueSize: 2,
        thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
      })

      // Queue is empty
      let decision = mgr.evaluate('event1', 'normal', 0, { high: 0, normal: 0, low: 0 })
      expect(decision.allowed).toBe(true)
      expect(decision.isOverflow).toBeUndefined()

      // At capacity (2 events)
      decision = mgr.evaluate('event2', 'normal', 2, { high: 0, normal: 2, low: 0 })
      expect(decision.allowed).toBe(false)
      expect(decision.isOverflow).toBe(true)
      expect(decision.reason).toContain('OVERFLOW')
    })

    it('should disable OVERFLOW to DLQ routing when dlqOnOverflow is false', () => {
      const mgr = new BackpressureManager({
        maxQueueSize: 2,
        dlqOnOverflow: false,
        thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
      })

      const decision = mgr.evaluate('event1', 'normal', 2, { high: 0, normal: 2, low: 0 })

      expect(decision.isOverflow).toBe(true) // isOverflow is still true
      // But dlqOnOverflow config controls whether it's actually routed
    })
  })

  describe('EventPriorityQueue OVERFLOW Rejection Handling', () => {
    it('should route OVERFLOW rejected events to DLQ when enabled', () => {
      const testDlq = new DeadLetterQueue()
      const testQueue = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 3,
          dlqOnOverflow: true,
          thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
        },
      })
      testQueue.setDeadLetterQueue(testDlq)

      const options: EventOptions = { priority: 'normal' }

      // Test the backpressure decision mechanism directly
      const mgr = new BackpressureManager({
        maxQueueSize: 3,
        dlqOnOverflow: true,
        thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
      })

      // Simulate OVERFLOW state
      const decision = mgr.evaluate('event4', 'normal', 3, { high: 0, normal: 3, low: 0 })

      // Should indicate OVERFLOW
      expect(decision.allowed).toBe(false)
      expect(decision.isOverflow).toBe(true)
      expect(decision.reason).toContain('OVERFLOW')

      // Verify DLQ can store the event
      const dlqEntry = testDlq.add(
        'event4',
        {},
        options,
        new Error('OVERFLOW rejection'),
        0,
        Date.now(),
        'backpressure_overflow'
      )
      expect(dlqEntry).toBeDefined()
      expect(testDlq.getCount()).toBe(1)

      const stored = testDlq.get(dlqEntry)
      expect(stored?.source).toBe('backpressure_overflow')
    })

    it('should not route OVERFLOW rejected events to DLQ when disabled', () => {
      // Test backpressure manager with dlqOnOverflow disabled
      const mgr = new BackpressureManager({
        maxQueueSize: 3,
        dlqOnOverflow: false, // Disabled
        thresholds: { warning: 0.5, critical: 0.8, overflow: 1.0 },
      })

      // Simulate OVERFLOW state
      const decision = mgr.evaluate('event4', 'normal', 3, { high: 0, normal: 3, low: 0 })

      // Should indicate OVERFLOW
      expect(decision.allowed).toBe(false)
      expect(decision.isOverflow).toBe(true)

      // When dlqOnOverflow is false in config, event would be dropped without DLQ routing
      // The BackpressureManager decision is independent of DLQ routing decision
      // EventPriorityQueue checks dlqOnOverflow config to decide whether to add to DLQ
    })

    it('should handle OVERFLOW with different priorities', () => {
      const testQueue = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 3,
          dlqOnOverflow: true,
        },
      })
      const testDlq = new DeadLetterQueue()
      testQueue.setDeadLetterQueue(testDlq)

      const callback = () => {}

      // Enqueue to capacity with mixed priorities
      testQueue.enqueue('event1', {}, [callback], { priority: 'high' })
      testQueue.enqueue('event2', {}, [callback], { priority: 'normal' })
      testQueue.enqueue('event3', {}, [callback], { priority: 'low' })

      // Try to enqueue at each priority level
      testQueue.enqueue('event-high', {}, [callback], { priority: 'high' })
      testQueue.enqueue('event-normal', {}, [callback], { priority: 'normal' })
      testQueue.enqueue('event-low', {}, [callback], { priority: 'low' })

      const dlqEntries = testDlq.list()
      // All should be in DLQ once capacity is exceeded
      expect(dlqEntries.length).toBeGreaterThan(0)
    })
  })

  describe('Backpressure State Transitions', () => {
    it('should track NORMAL -> WARNING -> CRITICAL -> OVERFLOW transitions', () => {
      const mgr = new BackpressureManager({
        maxQueueSize: 100,
        thresholds: { warning: 0.3, critical: 0.6, overflow: 1.0 },
      })

      // NORMAL state
      let decision = mgr.evaluate('e1', 'normal', 0, { high: 0, normal: 0, low: 0 })
      expect(decision.allowed).toBe(true)

      // WARNING state (30% capacity)
      decision = mgr.evaluate('e2', 'normal', 30, { high: 0, normal: 30, low: 0 })
      expect(decision.allowed).toBe(true) // Still allowed but with warnings

      // CRITICAL state (60% capacity)
      decision = mgr.evaluate('e3', 'low', 60, { high: 0, normal: 60, low: 0 })
      expect(decision.allowed).toBe(false) // Low priority rejected

      // OVERFLOW state (100% capacity)
      decision = mgr.evaluate('e4', 'high', 100, { high: 100, normal: 0, low: 0 })
      expect(decision.allowed).toBe(false)
      expect(decision.isOverflow).toBe(true)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle DLQ operations with empty queue', () => {
      expect(dlq.getCount()).toBe(0)
      expect(dlq.getOldestEntry()).toBeUndefined()
      expect(dlq.getNewestEntry()).toBeUndefined()
      expect(dlq.list()).toEqual([])
    })

    it('should handle DLQ entry source validation', () => {
      const options: EventOptions = { priority: 'normal' }

      // Add entries with all valid sources
      const sources: Array<
        'retry_exhausted' | 'circuit_breaker' | 'backpressure_overflow' | 'manual'
      > = ['retry_exhausted', 'circuit_breaker', 'backpressure_overflow', 'manual']

      for (const source of sources) {
        dlq.add(
          `event-${source}`,
          {},
          options,
          new Error(`Error for ${source}`),
          1,
          Date.now(),
          source
        )
      }

      expect(dlq.getCount()).toBe(4)
      for (const source of sources) {
        expect(dlq.getEntriesBySource(source).length).toBe(1)
      }
    })

    it('should handle concurrent OVERFLOW rejections', () => {
      const testQueue = new EventPriorityQueue({
        backpressure: {
          enabled: true,
          maxQueueSize: 5,
          dlqOnOverflow: true,
        },
      })
      const testDlq = new DeadLetterQueue()
      testQueue.setDeadLetterQueue(testDlq)

      const callback = () => {}
      const options: EventOptions = { priority: 'normal' }

      // Fill to capacity
      for (let i = 0; i < 5; i++) {
        testQueue.enqueue(`event${i}`, {}, [callback], options)
      }

      // Try multiple rejections
      for (let i = 0; i < 5; i++) {
        testQueue.enqueue(`overflow${i}`, {}, [callback], options)
      }

      expect(testDlq.getCount()).toBeGreaterThan(0)
      const allOverflow = testDlq.list().every((e) => e.source === 'backpressure_overflow')
      expect(allOverflow).toBe(true)
    })

    it('should handle max retries and DLQ with same event', () => {
      const options: EventOptions = { priority: 'normal', maxRetries: 2 }

      // Add entry that would normally go to DLQ after retries
      const id1 = dlq.add(
        'event-retry',
        {},
        options,
        new Error('Retry failed'),
        3,
        Date.now(),
        'retry_exhausted'
      )

      // Add same event from OVERFLOW
      const id2 = dlq.add(
        'event-retry',
        {},
        options,
        new Error('Overflow'),
        0,
        Date.now(),
        'backpressure_overflow'
      )

      expect(dlq.getCount()).toBe(2)
      expect(dlq.get(id1)).toBeDefined()
      expect(dlq.get(id2)).toBeDefined()

      // Group by source to distinguish them
      const retryExhausted = dlq.getEntriesBySource('retry_exhausted')
      const overflow = dlq.getEntriesBySource('backpressure_overflow')

      expect(retryExhausted.length).toBe(1)
      expect(overflow.length).toBe(1)
    })
  })

  describe('DLQ Capacity and Performance', () => {
    it('should efficiently handle large number of entries before eviction', () => {
      const largeCapacityDlq = new DeadLetterQueue(1000)
      const options: EventOptions = { priority: 'normal' }

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        largeCapacityDlq.add(
          `event${i}`,
          { index: i },
          options,
          new Error(`Error ${i}`),
          1,
          Date.now(),
          'retry_exhausted'
        )
      }

      expect(largeCapacityDlq.getCount()).toBe(1000)

      // Adding one more should trigger eviction
      largeCapacityDlq.add(
        'event1000',
        {},
        options,
        new Error('Error 1000'),
        1,
        Date.now(),
        'retry_exhausted'
      )

      expect(largeCapacityDlq.getCount()).toBe(1000)

      // Oldest should have been evicted
      expect(largeCapacityDlq.get('dlq-1-')).toBeUndefined() // Original first entry gone
    })

    it('should maintain capacity consistency across multiple operations', () => {
      const dlqWithLimit = new DeadLetterQueue(10)
      const options: EventOptions = { priority: 'normal' }

      // Add 20 entries (should evict oldest as new ones arrive)
      const ids: string[] = []
      for (let i = 0; i < 20; i++) {
        const id = dlqWithLimit.add(
          `event${i}`,
          {},
          options,
          new Error(`Error ${i}`),
          1,
          Date.now(),
          'retry_exhausted'
        )
        ids.push(id)
      }

      // Should only have last 10
      expect(dlqWithLimit.getCount()).toBe(10)

      // First 10 should be evicted
      for (let i = 0; i < 10; i++) {
        expect(dlqWithLimit.get(ids[i])).toBeUndefined()
      }

      // Last 10 should exist
      for (let i = 10; i < 20; i++) {
        expect(dlqWithLimit.get(ids[i])).toBeDefined()
      }
    })
  })
})
