import { beforeEach, describe, expect, it } from 'bun:test'
import { RateLimiter } from '../../../../src/drivers/kafka/RateLimiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
  })

  describe('Basic Functionality', () => {
    it('should allow messages within limit', () => {
      const config = { max: 3, duration: 1000 }

      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)
    })

    it('should deny messages exceeding limit', () => {
      const config = { max: 2, duration: 1000 }

      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false)
      expect(limiter.check('queue1', config)).toBe(false)
    })

    it('should allow messages after window expires', async () => {
      const config = { max: 1, duration: 100 }

      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(limiter.check('queue1', config)).toBe(true)
    })

    it('should handle zero limit', () => {
      const config = { max: 0, duration: 1000 }

      expect(limiter.check('queue1', config)).toBe(false)
      expect(limiter.check('queue1', config)).toBe(false)
    })
  })

  describe('Multiple Queues', () => {
    it('should track independent limits per queue', () => {
      const config = { max: 2, duration: 1000 }

      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false)

      expect(limiter.check('queue2', config)).toBe(true)
      expect(limiter.check('queue2', config)).toBe(true)
      expect(limiter.check('queue2', config)).toBe(false)
    })

    it('should allow different limits for different queues', () => {
      expect(limiter.check('queue1', { max: 1, duration: 1000 })).toBe(true)
      expect(limiter.check('queue1', { max: 1, duration: 1000 })).toBe(false)

      expect(limiter.check('queue2', { max: 3, duration: 1000 })).toBe(true)
      expect(limiter.check('queue2', { max: 3, duration: 1000 })).toBe(true)
      expect(limiter.check('queue2', { max: 3, duration: 1000 })).toBe(true)
      expect(limiter.check('queue2', { max: 3, duration: 1000 })).toBe(false)
    })
  })

  describe('Sliding Window', () => {
    it('should handle messages at window boundary', async () => {
      const config = { max: 2, duration: 100 }

      const _start = Date.now()
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false)

      // Wait until first message expires (after 100ms)
      await new Promise((resolve) => setTimeout(resolve, 110))

      // Should now allow one message
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false)
    })

    it('should correctly prune expired timestamps', async () => {
      const config = { max: 2, duration: 100 }

      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // After pruning via check, old timestamps should be gone
      expect(limiter.check('queue1', config)).toBe(true) // Causes prune
      const state = limiter.getState('queue1')
      expect(state.allowed).toBe(1) // Only the new one
    })
  })

  describe('Statistics', () => {
    it('should track allowed count', () => {
      const config = { max: 3, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue1', config)
      limiter.check('queue1', config)

      const stats = limiter.getStats('queue1')
      expect(stats.allowed).toBe(3)
      expect(stats.denied).toBe(0)
    })

    it('should track denied count', () => {
      const config = { max: 2, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue1', config)
      limiter.check('queue1', config)
      limiter.check('queue1', config)

      const stats = limiter.getStats('queue1')
      expect(stats.allowed).toBe(2)
      expect(stats.denied).toBe(2)
    })

    it('should return zero stats for non-existent queue', () => {
      const stats = limiter.getStats('nonexistent')
      expect(stats.allowed).toBe(0)
      expect(stats.denied).toBe(0)
    })

    it('should return all stats for all queues', () => {
      const config = { max: 2, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue1', config)
      limiter.check('queue1', config)

      limiter.check('queue2', config)
      limiter.check('queue2', config)

      const allStats = limiter.getAllStats()
      expect(allStats.queue1).toEqual({ allowed: 2, denied: 1 })
      expect(allStats.queue2).toEqual({ allowed: 2, denied: 0 })
    })
  })

  describe('State', () => {
    it('should return empty state for new queue', () => {
      const state = limiter.getState('queue1')
      expect(state.queue).toBe('queue1')
      expect(state.allowed).toBe(0)
      expect(state.remaining).toBe(0)
    })

    it('should track current timestamp count in state', () => {
      const config = { max: 5, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue1', config)
      limiter.check('queue1', config)

      const state = limiter.getState('queue1')
      expect(state.allowed).toBe(3)
    })

    it('should update state after reset', () => {
      const config = { max: 2, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue1', config)

      limiter.reset('queue1')

      const state = limiter.getState('queue1')
      expect(state.allowed).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset specific queue', () => {
      const config = { max: 2, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue2', config)

      limiter.reset('queue1')

      expect(limiter.check('queue1', config)).toBe(true) // Fresh start
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(false) // Limit enforced

      // queue2 should still have its previous state
      expect(limiter.getStats('queue2').allowed).toBe(1)
    })

    it('should reset all queues when no queue specified', () => {
      const config = { max: 2, duration: 1000 }

      limiter.check('queue1', config)
      limiter.check('queue2', config)

      limiter.reset()

      const stats1 = limiter.getStats('queue1')
      const stats2 = limiter.getStats('queue2')

      expect(stats1.allowed).toBe(0)
      expect(stats1.denied).toBe(0)
      expect(stats2.allowed).toBe(0)
      expect(stats2.denied).toBe(0)
    })
  })

  describe('High Frequency', () => {
    it('should handle rapid checks efficiently', () => {
      const config = { max: 100, duration: 1000 }

      let allowed = 0
      let denied = 0

      for (let i = 0; i < 150; i++) {
        if (limiter.check('queue1', config)) {
          allowed++
        } else {
          denied++
        }
      }

      expect(allowed).toBe(100)
      expect(denied).toBe(50)
    })

    it('should handle many queues', () => {
      const config = { max: 10, duration: 1000 }

      for (let i = 0; i < 50; i++) {
        const queue = `queue${i}`
        for (let j = 0; j < 15; j++) {
          limiter.check(queue, config)
        }
      }

      const allStats = limiter.getAllStats()
      expect(Object.keys(allStats)).toHaveLength(50)

      for (const stats of Object.values(allStats)) {
        expect(stats.allowed).toBe(10)
        expect(stats.denied).toBe(5)
      }
    })
  })

  describe('Variable Duration', () => {
    it('should respect different duration values', async () => {
      const config1 = { max: 1, duration: 50 }
      const config2 = { max: 1, duration: 200 }

      expect(limiter.check('queue1', config1)).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 75))
      expect(limiter.check('queue1', config1)).toBe(true) // 50ms window expired

      expect(limiter.check('queue2', config2)).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 75))
      expect(limiter.check('queue2', config2)).toBe(false) // 200ms window still active
    })
  })

  describe('Concurrent Access', () => {
    it('should handle concurrent checks on same queue', () => {
      const config = { max: 50, duration: 1000 }
      let allowed = 0

      // Simulate concurrent checks
      for (let i = 0; i < 100; i++) {
        if (limiter.check('queue1', config)) {
          allowed++
        }
      }

      expect(allowed).toBe(50)
      expect(limiter.getStats('queue1').allowed).toBe(50)
    })

    it('should handle concurrent checks on different queues', () => {
      const config = { max: 20, duration: 1000 }

      for (let i = 0; i < 50; i++) {
        const queue = i % 2 === 0 ? 'queue1' : 'queue2'
        limiter.check(queue, config)
      }

      expect(limiter.getStats('queue1').allowed).toBe(20)
      expect(limiter.getStats('queue2').allowed).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero duration gracefully', () => {
      const config = { max: 1, duration: 0 }

      // Zero duration means immediate expiration
      expect(limiter.check('queue1', config)).toBe(true)
      // Next check in same millisecond might pass if timing is right
      // or fail if the window has already expired
      const result = limiter.check('queue1', config)
      expect(typeof result).toBe('boolean') // Just ensure no error
    })

    it('should handle very large max limit', () => {
      const config = { max: 1000000, duration: 1000 }

      for (let i = 0; i < 1000; i++) {
        expect(limiter.check('queue1', config)).toBe(true)
      }

      expect(limiter.getStats('queue1').allowed).toBe(1000)
    })

    it('should handle negative duration as edge case', () => {
      const config = { max: 1, duration: -100 }

      // Negative duration means all timestamps are considered expired
      expect(limiter.check('queue1', config)).toBe(true)
      expect(limiter.check('queue1', config)).toBe(true) // Should allow (expired immediately)
    })
  })
})
