import { beforeEach, describe, expect, test } from 'bun:test'
import type { EventTask } from '@gravito/core'
import { DeduplicationManager } from '../../src/aggregation/DeduplicationManager'

describe('DeduplicationManager', () => {
  let dedup: DeduplicationManager

  beforeEach(() => {
    dedup = new DeduplicationManager()
  })

  describe('Initialization', () => {
    test('should create deduplication manager', () => {
      expect(dedup).toBeDefined()
    })

    test('should initialize with default config', () => {
      expect(dedup).toBeDefined()
    })
  })

  describe('Event Addition', () => {
    test('should add an event', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      expect(dedup.getPatternCount()).toBeGreaterThan(0)
    })

    test('should track pattern count', () => {
      const event1: EventTask = {
        id: 'task-1',
        hook: 'order:created',
        args: { orderId: '123' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const event2: EventTask = {
        id: 'task-2',
        hook: 'order:updated',
        args: { orderId: '456' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const countBefore = dedup.getPatternCount()
      dedup.addEvent(event1)
      const countAfter1 = dedup.getPatternCount()
      dedup.addEvent(event2)
      const countAfter2 = dedup.getPatternCount()

      expect(countAfter1).toBeGreaterThan(countBefore)
      expect(countAfter2).toBeGreaterThanOrEqual(countAfter1)
    })
  })

  describe('Deduplication', () => {
    test('should deduplicate events with same pattern', () => {
      const event1: EventTask = {
        id: 'task-1',
        hook: 'order:created',
        args: { orderId: '123' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const event2: EventTask = {
        id: 'task-2',
        hook: 'order:created',
        args: { orderId: '123' },
        options: { timeout: 5000, priority: 'high' },
        callbacks: [],
        createdAt: Date.now() + 1,
        enqueuedAt: Date.now() + 1,
        retryCount: 0,
      }

      dedup.addEvent(event1)
      const countBefore = dedup.getPatternCount()
      dedup.addEvent(event2)
      const countAfter = dedup.getPatternCount()

      // Second event should have been deduplicated
      expect(countAfter).toBeLessThanOrEqual(countBefore)
    })

    test('should return deduplicated events', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      const deduplicated = dedup.getDeduplicated()

      expect(deduplicated).toBeDefined()
      expect(deduplicated.length).toBeGreaterThan(0)
    })
  })

  describe('Pattern Management', () => {
    test('should check if pattern exists', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      const patterns = dedup.getPatterns()

      expect(patterns.length).toBeGreaterThan(0)
    })

    test('should remove pattern', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      const patterns = dedup.getPatterns()
      expect(patterns.length).toBeGreaterThan(0)

      if (patterns.length > 0) {
        const removed = dedup.removePattern(patterns[0])
        expect(removed).toBe(true)
      }
    })

    test('should clear all patterns', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      expect(dedup.getPatternCount()).toBeGreaterThan(0)

      dedup.clear()
      expect(dedup.getPatternCount()).toBe(0)
    })
  })

  describe('Statistics', () => {
    test('should report deduplication stats', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      const stats = dedup.getStats()

      expect(stats).toBeDefined()
      expect(stats.totalEvents).toBeGreaterThan(0)
    })

    test('should track deduplication rate', () => {
      const event1: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      const event2: EventTask = {
        id: 'task-2',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now() + 1,
        enqueuedAt: Date.now() + 1,
        retryCount: 0,
      }

      dedup.addEvent(event1)
      dedup.addEvent(event2)

      const rate = dedup.getDeduplicationRate()
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    test('should reset stats', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      dedup.resetStats()

      const stats = dedup.getStats()
      expect(stats.totalEvents).toBe(0)
    })
  })

  describe('Shutdown', () => {
    test('should shutdown cleanly', () => {
      const event: EventTask = {
        id: 'task-1',
        hook: 'test:hook',
        args: { data: 'test' },
        options: { timeout: 5000 },
        callbacks: [],
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
        retryCount: 0,
      }

      dedup.addEvent(event)
      dedup.shutdown()

      expect(dedup.getPatternCount()).toBe(0)
    })
  })
})
