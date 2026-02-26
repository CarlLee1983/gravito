import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { DeduplicationManager } from '../../src/aggregation/DeduplicationManager'
import { makeEventTask, resetTaskCounter } from '../helpers'

describe('DeduplicationManager', () => {
  let manager: DeduplicationManager

  beforeEach(() => {
    resetTaskCounter()
    manager = new DeduplicationManager({ enableCleanup: false })
  })

  afterEach(() => {
    manager.shutdown()
  })

  // ─── addEvent() 基本行為 ───────────────────────────────────────────

  describe('addEvent() 基本行為', () => {
    it('should add first event with new pattern', () => {
      const event = makeEventTask('user.created', 'normal', { args: { userId: '1' } })
      manager.addEvent(event)

      expect(manager.getPatternCount()).toBe(1)
      expect(manager.getStats().totalEvents).toBe(1)
    })

    it('should deduplicate events with the same pattern', () => {
      const e1 = makeEventTask('user.created', 'normal', { args: { userId: '1' } })
      const e2 = makeEventTask('user.created', 'normal', { args: { userId: '1' } })
      manager.addEvent(e1)
      manager.addEvent(e2)

      // Same pattern function output => same pattern => deduplicated
      expect(manager.getPatternCount()).toBe(1)
      expect(manager.getStats().totalEvents).toBe(2)
      expect(manager.getStats().removedCount).toBe(1)
    })

    it('should keep separate entries for different patterns', () => {
      const e1 = makeEventTask('user.created', 'normal', { args: { userId: '1' } })
      const e2 = makeEventTask('order.created', 'normal', { args: { orderId: '2' } })
      manager.addEvent(e1)
      manager.addEvent(e2)

      expect(manager.getPatternCount()).toBe(2)
      expect(manager.getStats().removedCount).toBe(0)
    })

    it('should track totalEvents even when events are deduplicated', () => {
      for (let i = 0; i < 5; i++) {
        manager.addEvent(makeEventTask('same.hook', 'normal', { args: { key: 'same' } }))
      }

      expect(manager.getStats().totalEvents).toBe(5)
      expect(manager.getPatternCount()).toBe(1)
      expect(manager.getStats().removedCount).toBe(4)
    })
  })

  // ─── getDeduplicated() 快取機制 ────────────────────────────────────

  describe('getDeduplicated() 快取機制', () => {
    it('should return deduplicated list of events', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal', { args: { x: '1' } }))
      manager.addEvent(makeEventTask('hook.b', 'normal', { args: { y: '2' } }))

      const result = manager.getDeduplicated()
      expect(result).toHaveLength(2)
    })

    it('should return cached result on second call without new events', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal', { args: { x: '1' } }))

      const first = manager.getDeduplicated()
      const second = manager.getDeduplicated()

      // Same reference means cache hit
      expect(first).toBe(second)
    })

    it('should invalidate cache when new event is added', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal', { args: { x: '1' } }))

      const first = manager.getDeduplicated()
      manager.addEvent(makeEventTask('hook.b', 'normal', { args: { y: '2' } }))
      const second = manager.getDeduplicated()

      // Different reference after cache invalidation
      expect(first).not.toBe(second)
      expect(second).toHaveLength(2)
    })

    it('should return empty array when no events added', () => {
      const result = manager.getDeduplicated()
      expect(result).toHaveLength(0)
    })
  })

  // ─── 優先級合并決策 ────────────────────────────────────────────────

  describe('優先級合并決策', () => {
    it('should replace lower priority event with higher priority event (critical < high < normal < low)', () => {
      // PRIORITY_ORDER: critical=0, high=1, normal=2, low=3
      // Lower number = higher priority
      const lowPriority = makeEventTask('hook.x', 'low', { args: { key: 'same' } })
      const criticalPriority = makeEventTask('hook.x', 'critical', { args: { key: 'same' } })

      manager.addEvent(lowPriority)
      manager.addEvent(criticalPriority)

      const result = manager.getDeduplicated()
      expect(result).toHaveLength(1)
      expect(result[0].options.priority).toBe('critical')
    })

    it('should keep existing higher-priority event when lower-priority event arrives', () => {
      const highEvent = makeEventTask('hook.x', 'high', { args: { key: 'same' } })
      const normalEvent = makeEventTask('hook.x', 'normal', { args: { key: 'same' } })

      manager.addEvent(highEvent)
      manager.addEvent(normalEvent)

      const result = manager.getDeduplicated()
      expect(result).toHaveLength(1)
      expect(result[0].options.priority).toBe('high')
    })

    it('should keep earlier event when priorities are equal', () => {
      const earlier = makeEventTask('hook.x', 'normal', {
        args: { key: 'same' },
        createdAt: 1000,
      })
      const later = makeEventTask('hook.x', 'normal', {
        args: { key: 'same' },
        createdAt: 2000,
      })

      manager.addEvent(earlier)
      manager.addEvent(later)

      const result = manager.getDeduplicated()
      expect(result).toHaveLength(1)
      expect(result[0].createdAt).toBe(1000)
    })

    it('should count removed events correctly across multiple merges', () => {
      // Add 4 events with same pattern but different priorities
      manager.addEvent(makeEventTask('hook.x', 'low', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.x', 'normal', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.x', 'high', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.x', 'critical', { args: { key: 'same' } }))

      expect(manager.getStats().totalEvents).toBe(4)
      expect(manager.getStats().removedCount).toBe(3)
      expect(manager.getPatternCount()).toBe(1)
    })
  })

  // ─── optimizePatterns() ────────────────────────────────────────────

  describe('optimizePatterns()', () => {
    it('should return original patterns when fewer than 3', () => {
      const result = manager.optimizePatterns(['product:1', 'product:2'])
      expect(result).toEqual(['product:1', 'product:2'])
    })

    it('should merge patterns into wildcard when prefix exceeds 50% threshold', () => {
      const result = manager.optimizePatterns(['product:1', 'product:2', 'product:3'])

      // All 3 patterns share 'product' prefix, 3/3 >= 50%
      expect(result).toEqual(['product:*'])
    })

    it('should keep patterns below threshold as-is', () => {
      const result = manager.optimizePatterns(['product:1', 'order:2', 'user:3', 'user:4'])

      // 'user' has 2/4 = 50% which equals threshold ceil(4*0.5)=2
      // 'product' has 1/4 < threshold
      // 'order' has 1/4 < threshold
      expect(result).toContain('user:*')
      expect(result).toContain('product:1')
      expect(result).toContain('order:2')
      expect(result).toHaveLength(3)
    })

    it('should handle mixed prefixes correctly', () => {
      const result = manager.optimizePatterns([
        'product:1',
        'product:2',
        'product:3',
        'order:1',
        'order:2',
      ])

      // 'product' has 3/5 >= ceil(5*0.5)=3 -> wildcard
      // 'order' has 2/5 < 3 -> keep originals
      expect(result).toContain('product:*')
      expect(result).toContain('order:1')
      expect(result).toContain('order:2')
    })
  })

  // ─── findEventsByPattern() 通配符 ─────────────────────────────────

  describe('findEventsByPattern() 通配符', () => {
    it('should find exact match', () => {
      const event = makeEventTask('user.created', 'normal')
      manager.addEvent(event)

      // Default pattern function generates from args keys
      const pattern = manager.getPatterns()[0]
      const results = manager.findEventsByPattern(pattern)
      expect(results).toHaveLength(1)
    })

    it('should return empty array when no match found', () => {
      manager.addEvent(makeEventTask('user.created', 'normal'))

      const results = manager.findEventsByPattern('nonexistent.pattern')
      expect(results).toHaveLength(0)
    })

    it('should match patterns using wildcard *', () => {
      // Use idempotencyKey deduplication to get predictable patterns
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        deduplication: 'idempotencyKey',
      })

      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: { priority: 'normal', idempotencyKey: 'user:1', escalation: { enabled: false } },
        })
      )
      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: { priority: 'normal', idempotencyKey: 'user:2', escalation: { enabled: false } },
        })
      )
      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: {
            priority: 'normal',
            idempotencyKey: 'order:1',
            escalation: { enabled: false },
          },
        })
      )

      // Patterns: 'idempotency:user:1', 'idempotency:user:2', 'idempotency:order:1'
      const results = mgr.findEventsByPattern('idempotency:user:*')
      expect(results).toHaveLength(2)

      mgr.shutdown()
    })

    it('should not duplicate events when both exact and wildcard match', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        deduplication: 'idempotencyKey',
      })

      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: { priority: 'normal', idempotencyKey: 'user:1', escalation: { enabled: false } },
        })
      )

      // Pattern 'idempotency:user:1' matches both exact and 'idempotency:user:*'
      // But using exact pattern should still give 1 result (no duplicates from Set)
      const results = mgr.findEventsByPattern('idempotency:user:*')
      expect(results).toHaveLength(1)

      mgr.shutdown()
    })

    it('should handle dot in pattern correctly (escaped)', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        deduplication: 'idempotencyKey',
      })

      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: {
            priority: 'normal',
            idempotencyKey: 'user.created',
            escalation: { enabled: false },
          },
        })
      )
      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: {
            priority: 'normal',
            idempotencyKey: 'userXcreated',
            escalation: { enabled: false },
          },
        })
      )

      // 'user.*' should match 'idempotency:user.created'
      // but '.' is escaped, so 'userXcreated' should NOT match 'user.*'
      const results = mgr.findEventsByPattern('idempotency:user.*')
      expect(results).toHaveLength(1)

      mgr.shutdown()
    })
  })

  // ─── shutdown() ───────────────────────────────────────────────────

  describe('shutdown()', () => {
    it('should clear all data on shutdown', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal', { args: { x: '1' } }))
      manager.addEvent(makeEventTask('hook.b', 'normal', { args: { y: '2' } }))

      manager.shutdown()

      expect(manager.getPatternCount()).toBe(0)
      expect(manager.getDeduplicated()).toHaveLength(0)
    })

    it('should reset stats on shutdown', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal'))
      manager.addEvent(makeEventTask('hook.a', 'normal'))

      manager.shutdown()

      const stats = manager.getStats()
      expect(stats.totalEvents).toBe(0)
      expect(stats.removedCount).toBe(0)
      expect(stats.deduplicationRate).toBe(0)
    })

    it('should stop cleanup timer on shutdown', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: true,
        cleanupIntervalMs: 100,
      })

      mgr.addEvent(makeEventTask('hook.a', 'normal'))
      mgr.shutdown()

      // After shutdown, no cleanup should fire (no error/crash)
      expect(mgr.getPatternCount()).toBe(0)
    })
  })

  // ─── getStats() ───────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return a copy of stats (immutable)', () => {
      manager.addEvent(makeEventTask('hook.a', 'normal'))

      const stats1 = manager.getStats()
      const stats2 = manager.getStats()

      expect(stats1).toEqual(stats2)
      expect(stats1).not.toBe(stats2) // Different references
    })

    it('should calculate deduplication rate correctly', () => {
      // Add 4 events, 3 are duplicates
      manager.addEvent(makeEventTask('hook.a', 'normal', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.a', 'high', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.a', 'critical', { args: { key: 'same' } }))
      manager.addEvent(makeEventTask('hook.a', 'low', { args: { key: 'same' } }))

      const stats = manager.getStats()
      // removedCount=3, totalEvents=4 => rate = round(3/4 * 100) = 75
      expect(stats.deduplicationRate).toBe(75)
    })

    it('should return zero rate when no events added', () => {
      const stats = manager.getStats()
      expect(stats.deduplicationRate).toBe(0)
      expect(stats.totalEvents).toBe(0)
    })
  })

  // ─── 特殊模式生成 ─────────────────────────────────────────────────

  describe('特殊模式生成', () => {
    it('should use idempotencyKey when deduplication strategy is idempotencyKey', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        deduplication: 'idempotencyKey',
      })

      mgr.addEvent(
        makeEventTask('hook', 'normal', {
          options: {
            priority: 'normal',
            idempotencyKey: 'order-123',
            escalation: { enabled: false },
          },
        })
      )

      const patterns = mgr.getPatterns()
      expect(patterns).toHaveLength(1)
      expect(patterns[0]).toBe('idempotency:order-123')

      mgr.shutdown()
    })

    it('should use custom pattern function when provided', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        pattern: (args: unknown) => {
          const obj = args as Record<string, string>
          return `custom:${obj.type}`
        },
      })

      mgr.addEvent(makeEventTask('hook', 'normal', { args: { type: 'user' } }))
      mgr.addEvent(makeEventTask('hook', 'normal', { args: { type: 'order' } }))

      const patterns = mgr.getPatterns()
      expect(patterns).toHaveLength(2)
      expect(patterns).toContain('custom:user')
      expect(patterns).toContain('custom:order')

      mgr.shutdown()
    })

    it('should fall back to hook:default when custom pattern function throws', () => {
      const mgr = new DeduplicationManager({
        enableCleanup: false,
        pattern: () => {
          throw new Error('pattern error')
        },
      })

      const event = makeEventTask('my.hook', 'normal')
      mgr.addEvent(event)

      const patterns = mgr.getPatterns()
      expect(patterns).toHaveLength(1)
      expect(patterns[0]).toBe('my.hook:default')

      mgr.shutdown()
    })
  })
})
