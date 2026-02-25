import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventOptions } from '../../src/events/EventOptions'
import {
  PriorityEscalationManager,
  PriorityStatistics,
} from '../../src/events/PriorityEscalationManager'
import type { EventTask } from '../../src/events/types'

describe('PriorityEscalationManager', () => {
  describe('calculateCurrentPriority', () => {
    it('should maintain original priority when wait time is low', () => {
      const task: EventTask = {
        id: 'test-1',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 10, // 10ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('high')
    })

    it('should escalate LOW → NORMAL after 200ms wait', () => {
      const task: EventTask = {
        id: 'test-2',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'low' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 250, // 250ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('normal')
    })

    it('should escalate NORMAL → HIGH after 100ms wait', () => {
      const task: EventTask = {
        id: 'test-3',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 150, // 150ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('high')
    })

    it('should escalate HIGH → CRITICAL after 50ms wait', () => {
      const task: EventTask = {
        id: 'test-4',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 75, // 75ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('critical')
    })

    it('should force CRITICAL when maxWaitTimeMs exceeded', () => {
      const task: EventTask = {
        id: 'test-5',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'low' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 600, // 600ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { lowToNormal: 200, normalToHigh: 100, highToCritical: 50 },
        maxWaitTimeMs: 500,
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('critical')
    })

    it('should return original priority when escalation is disabled', () => {
      const task: EventTask = {
        id: 'test-6',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'low' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 1000, // 1000ms ago
      }
      const config: EventOptions['escalation'] = { enabled: false }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task, config)
      expect(priority).toBe('low')
    })

    it('should use default thresholds when not provided', () => {
      const task: EventTask = {
        id: 'test-7',
        hook: 'test:event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 150, // 150ms ago
      }

      const priority = PriorityEscalationManager.calculateCurrentPriority(task)
      expect(priority).toBe('high')
    })
  })

  describe('comparePriority', () => {
    it('should order CRITICAL > HIGH > NORMAL > LOW', () => {
      const critical: EventTask = {
        id: '1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }
      const high: EventTask = {
        id: '2',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }
      const normal: EventTask = {
        id: '3',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }
      const low: EventTask = {
        id: '4',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'low' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      // CRITICAL should be "less than" (come before) HIGH
      expect(PriorityEscalationManager.comparePriority(critical, high)).toBeLessThan(0)
      // HIGH should be "less than" NORMAL
      expect(PriorityEscalationManager.comparePriority(high, normal)).toBeLessThan(0)
      // NORMAL should be "less than" LOW
      expect(PriorityEscalationManager.comparePriority(normal, low)).toBeLessThan(0)
    })

    it('should use timestamp for same-priority tasks', () => {
      const now = Date.now()
      const earlier: EventTask = {
        id: '1',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: now,
        enqueuedAt: now - 100,
      }
      const later: EventTask = {
        id: '2',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: now,
        enqueuedAt: now,
      }

      // earlier should come before later
      expect(PriorityEscalationManager.comparePriority(earlier, later)).toBeLessThan(0)
    })
  })

  describe('shouldProcessImmediately', () => {
    it('should return true for CRITICAL priority', () => {
      const task: EventTask = {
        id: 'test',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'critical' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      expect(PriorityEscalationManager.shouldProcessImmediately(task)).toBe(true)
    })

    it('should return false for non-CRITICAL priority', () => {
      const task: EventTask = {
        id: 'test',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now(),
      }

      expect(PriorityEscalationManager.shouldProcessImmediately(task)).toBe(false)
    })

    it('should return true for escalated CRITICAL', () => {
      const task: EventTask = {
        id: 'test',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 100, // 100ms ago
      }
      const config: EventOptions['escalation'] = {
        enabled: true,
        thresholds: { normalToHigh: 100, highToCritical: 50 },
      }

      expect(PriorityEscalationManager.shouldProcessImmediately(task, config)).toBe(true)
    })
  })

  describe('calculateOverdueTime', () => {
    it('should return 0 for non-overdue tasks', () => {
      const task: EventTask = {
        id: 'test',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'high' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 10, // 10ms ago (expected max: 50ms)
      }

      const overdueTime = PriorityEscalationManager.calculateOverdueTime(task)
      expect(overdueTime).toBeGreaterThanOrEqual(0)
      expect(overdueTime).toBeLessThan(50)
    })

    it('should return positive value for overdue tasks', () => {
      const task: EventTask = {
        id: 'test',
        hook: 'event',
        args: {},
        callbacks: [],
        options: { priority: 'normal' },
        createdAt: Date.now(),
        enqueuedAt: Date.now() - 300, // 300ms ago (expected max: 200ms)
      }

      const overdueTime = PriorityEscalationManager.calculateOverdueTime(task)
      expect(overdueTime).toBeGreaterThan(0)
    })
  })
})

describe('PriorityStatistics', () => {
  let stats: PriorityStatistics

  beforeEach(() => {
    stats = new PriorityStatistics()
  })

  it('should track event counts by priority', () => {
    stats.recordEvent('critical')
    stats.recordEvent('critical')
    stats.recordEvent('high')
    stats.recordEvent('normal')

    const distribution = stats.getDistribution()
    expect(distribution.critical).toBe('50.00%')
    expect(distribution.high).toBe('25.00%')
    expect(distribution.normal).toBe('25.00%')
    expect(distribution.low).toBe('0.00%')
  })

  it('should record priority escalations', () => {
    stats.recordEscalation('low', 'normal')
    stats.recordEscalation('normal', 'high')
    stats.recordEscalation('high', 'critical')
    stats.recordEscalation('normal', 'high')

    const escalationStats = stats.getEscalationStats()
    expect(escalationStats.total).toBe(4)
    expect(escalationStats.byTransition['low->normal']).toBe(1)
    expect(escalationStats.byTransition['normal->high']).toBe(2)
    expect(escalationStats.byTransition['high->critical']).toBe(1)
  })

  it('should reset statistics', () => {
    stats.recordEvent('critical')
    stats.recordEvent('high')
    stats.recordEscalation('low', 'normal')

    stats.reset()

    const distribution = stats.getDistribution()
    expect(distribution.critical).toBe('0%')
    expect(distribution.high).toBe('0%')

    const escalationStats = stats.getEscalationStats()
    expect(escalationStats.total).toBe(0)
  })

  it('should return empty distribution for zero events', () => {
    const distribution = stats.getDistribution()
    expect(distribution.critical).toBe('0%')
    expect(distribution.high).toBe('0%')
    expect(distribution.normal).toBe('0%')
    expect(distribution.low).toBe('0%')
  })

  it('should ignore same-priority escalations', () => {
    stats.recordEscalation('high', 'high') // Should be ignored

    const escalationStats = stats.getEscalationStats()
    expect(escalationStats.total).toBe(0)
  })

  it('should provide complete statistics via getStats', () => {
    stats.recordEvent('critical')
    stats.recordEvent('high')
    stats.recordEscalation('low', 'normal')

    const fullStats = stats.getStats()
    expect(fullStats).toHaveProperty('eventCounts')
    expect(fullStats).toHaveProperty('escalationStats')
    expect(fullStats).toHaveProperty('distribution')
    expect(fullStats.eventCounts.critical).toBe(1)
    expect(fullStats.eventCounts.high).toBe(1)
  })
})
