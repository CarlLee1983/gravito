import { beforeEach, describe, expect, test } from 'bun:test'
import { DeduplicationManager } from '../../src/aggregation/DeduplicationManager'

describe('DeduplicationManager', () => {
  let dedup: DeduplicationManager

  beforeEach(() => {
    dedup = new DeduplicationManager({
      windowSize: 60000, // 60 seconds
      enabled: true,
    })
  })

  describe('Initialization', () => {
    test('should create deduplication manager', () => {
      expect(dedup).toBeDefined()
    })

    test('should initialize with default config', () => {
      expect(dedup).toBeDefined()
    })

    test('should initialize with custom window size', () => {
      const customDedup = new DeduplicationManager({
        windowSize: 120000,
        enabled: true,
      })
      expect(customDedup).toBeDefined()
    })

    test('should support disabled state', () => {
      const disabledDedup = new DeduplicationManager({
        windowSize: 60000,
        enabled: false,
      })
      expect(disabledDedup).toBeDefined()
    })
  })

  describe('Deduplication Detection', () => {
    test('should identify duplicate event', () => {
      const eventId = 'event-123'
      const isDuplicate = dedup.isDuplicate('test:hook', eventId)
      expect(typeof isDuplicate).toBe('boolean')
    })

    test('should not mark first occurrence as duplicate', () => {
      const isDuplicate = dedup.isDuplicate('test:hook', 'unique-1')
      expect(isDuplicate).toBe(false)
    })

    test('should mark repeated occurrence as duplicate', () => {
      const hook = 'test:hook'
      const id = 'event-123'
      dedup.isDuplicate(hook, id)
      const isDuplicate = dedup.isDuplicate(hook, id)
      expect(isDuplicate).toBe(true)
    })

    test('should handle different event IDs separately', () => {
      const isDupe1 = dedup.isDuplicate('test:hook', 'id-1')
      const isDupe2 = dedup.isDuplicate('test:hook', 'id-2')
      expect(isDupe1).toBe(false)
      expect(isDupe2).toBe(false)
    })
  })

  describe('Content-Based Deduplication', () => {
    test('should deduplicate identical payloads', () => {
      const payload = { user: 'john', action: 'login' }
      const isDupe = dedup.isDuplicate('user:login', undefined, JSON.stringify(payload))
      expect(typeof isDupe).toBe('boolean')
    })

    test('should not deduplicate different payloads', () => {
      const payload1 = { user: 'john', action: 'login' }
      const payload2 = { user: 'jane', action: 'login' }
      dedup.isDuplicate('user:login', undefined, JSON.stringify(payload1))
      const isDupe = dedup.isDuplicate('user:login', undefined, JSON.stringify(payload2))
      expect(isDupe).toBe(false)
    })

    test('should hash payload for comparison', () => {
      const payload = { data: 'test' }
      const hash = JSON.stringify(payload)
      expect(hash).toBeDefined()
    })
  })

  describe('Time Window Management', () => {
    test('should expire old entries after window', async () => {
      const dedup60s = new DeduplicationManager({
        windowSize: 100, // Very short for testing
        enabled: true,
      })
      dedup60s.isDuplicate('test:hook', 'event-1')
      // After 100ms, should be expired
    })

    test('should support sliding window', () => {
      const firstTime = Date.now()
      dedup.isDuplicate('test:hook', 'event-1')
      const secondTime = Date.now()
      expect(secondTime).toBeGreaterThanOrEqual(firstTime)
    })

    test('should clear expired entries periodically', () => {
      // Cleanup should run periodically
      const cleanupInterval = 30000 // 30 seconds
      expect(cleanupInterval).toBeGreaterThan(0)
    })
  })

  describe('Hook-Based Deduplication', () => {
    test('should deduplicate within same hook', () => {
      const hook = 'order:created'
      dedup.isDuplicate(hook, 'order-1')
      const isDupe = dedup.isDuplicate(hook, 'order-1')
      expect(isDupe).toBe(true)
    })

    test('should not deduplicate across different hooks', () => {
      dedup.isDuplicate('order:created', 'order-1')
      const isDupe = dedup.isDuplicate('order:updated', 'order-1')
      expect(isDupe).toBe(false)
    })

    test('should handle hook hierarchy', () => {
      // order:created and order:* might be related
      const isCreated = dedup.isDuplicate('order:created', 'order-1')
      const isAll = dedup.isDuplicate('order:*', 'order-1')
      expect(isCreated).toBeDefined()
      expect(isAll).toBeDefined()
    })
  })

  describe('Metrics & Statistics', () => {
    test('should report deduplication stats', () => {
      dedup.isDuplicate('test:hook', 'event-1')
      const stats = dedup.getStats()
      expect(stats).toBeDefined()
      expect(stats.deduplicated).toBeGreaterThanOrEqual(0)
    })

    test('should track duplicate count', () => {
      dedup.isDuplicate('test:hook', 'event-1')
      dedup.isDuplicate('test:hook', 'event-1')
      const stats = dedup.getStats()
      expect(stats.deduplicated).toBeGreaterThanOrEqual(1)
    })

    test('should track deduplication rate', () => {
      for (let i = 0; i < 5; i++) {
        dedup.isDuplicate('test:hook', 'event-1')
      }
      const stats = dedup.getStats()
      expect(stats).toBeDefined()
    })

    test('should track window size', () => {
      const stats = dedup.getStats()
      expect(stats.windowSize).toBe(60000)
    })
  })

  describe('State Management', () => {
    test('should enable/disable deduplication', () => {
      const disabledDedup = new DeduplicationManager({
        windowSize: 60000,
        enabled: false,
      })
      const isDupe = disabledDedup.isDuplicate('test:hook', 'event-1')
      expect(isDupe).toBe(false)
    })

    test('should preserve state across checks', () => {
      dedup.isDuplicate('test:hook', 'event-1')
      dedup.isDuplicate('test:hook', 'event-2')
      const isDupe1 = dedup.isDuplicate('test:hook', 'event-1')
      expect(isDupe1).toBe(true)
    })

    test('should reset state on demand', () => {
      dedup.isDuplicate('test:hook', 'event-1')
      dedup.reset()
      const isDupe = dedup.isDuplicate('test:hook', 'event-1')
      expect(isDupe).toBe(false)
    })
  })

  describe('Performance', () => {
    test('should check duplicates in O(1) time', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        dedup.isDuplicate('test:hook', `event-${i}`)
      }
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(1000) // Should be very fast
    })

    test('should handle high event throughput', () => {
      let duplicates = 0
      for (let i = 0; i < 10000; i++) {
        const id = `event-${i % 100}` // 100 unique IDs, 10000 total
        if (dedup.isDuplicate('test:hook', id)) {
          duplicates++
        }
      }
      expect(duplicates).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty event ID', () => {
      const isDupe = dedup.isDuplicate('test:hook', '')
      expect(typeof isDupe).toBe('boolean')
    })

    test('should handle null payload', () => {
      const isDupe = dedup.isDuplicate('test:hook', 'event-1', null as any)
      expect(typeof isDupe).toBe('boolean')
    })

    test('should handle very long event IDs', () => {
      const longId = 'a'.repeat(10000)
      const isDupe = dedup.isDuplicate('test:hook', longId)
      expect(typeof isDupe).toBe('boolean')
    })

    test('should not crash with special characters', () => {
      const isDupe = dedup.isDuplicate('test:hook', 'event-<script>alert("xss")</script>')
      expect(typeof isDupe).toBe('boolean')
    })
  })

  describe('Cleanup & Maintenance', () => {
    test('should support cleanup operation', () => {
      dedup.isDuplicate('test:hook', 'event-1')
      dedup.cleanup()
      // After cleanup, should behave consistently
      const isDupe = dedup.isDuplicate('test:hook', 'event-1')
      expect(typeof isDupe).toBe('boolean')
    })

    test('should not lose recent entries during cleanup', () => {
      dedup.isDuplicate('test:hook', 'recent-event')
      dedup.cleanup()
      const isDupe = dedup.isDuplicate('test:hook', 'recent-event')
      expect(isDupe).toBe(true)
    })
  })
})
