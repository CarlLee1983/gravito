import { beforeEach, describe, expect, it } from 'bun:test'
import { OffsetTracker } from '../../../../src/drivers/kafka/OffsetTracker'

describe('OffsetTracker', () => {
  let tracker: OffsetTracker

  beforeEach(() => {
    tracker = new OffsetTracker()
  })

  describe('Tracking', () => {
    it('should track offsets', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '101')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(2)
    })

    it('should track multiple partitions independently', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 1, '50')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(2)
    })

    it('should track multiple topics independently', () => {
      tracker.track('topic1', 0, '100')
      tracker.track('topic2', 0, '200')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(2)
    })
  })

  describe('Resolution', () => {
    it('should resolve tracked offsets', () => {
      tracker.track('test', 0, '100')
      tracker.resolve('test', 0, '100')

      const stats = tracker.getStats()
      expect(stats.pending).toBe(0)
      expect(stats.committed).toBe(1)
    })

    it('should not resolve untracked offsets', () => {
      tracker.resolve('test', 0, '100')

      const stats = tracker.getStats()
      expect(stats.committed).toBe(0)
    })

    it('should handle multiple resolutions', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '101')
      tracker.track('test', 0, '102')

      tracker.resolve('test', 0, '100')
      tracker.resolve('test', 0, '101')

      const stats = tracker.getStats()
      expect(stats.pending).toBe(1)
      expect(stats.committed).toBe(2)
    })
  })

  describe('Committable Offsets', () => {
    it('should return committed offsets', () => {
      tracker.track('test', 0, '100')
      tracker.resolve('test', 0, '100')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(1)
      expect(committable[0]?.offset).toBe('100')
    })

    it('should not return offsets with pending items', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '101')

      tracker.resolve('test', 0, '100')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(0)
    })

    it('should handle multiple partitions', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 1, '50')

      tracker.resolve('test', 0, '100')
      tracker.resolve('test', 1, '50')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(2)
    })

    it('should handle multiple topics', () => {
      tracker.track('topic1', 0, '100')
      tracker.track('topic2', 0, '200')

      tracker.resolve('topic1', 0, '100')
      tracker.resolve('topic2', 0, '200')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(2)
      expect(committable.some((c) => c.topic === 'topic1')).toBe(true)
      expect(committable.some((c) => c.topic === 'topic2')).toBe(true)
    })

    it('should return empty when nothing is committable', () => {
      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(0)
    })
  })

  describe('Clear', () => {
    it('should clear topic data', () => {
      tracker.track('test', 0, '100')
      tracker.resolve('test', 0, '100')

      tracker.clear('test')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(0)
      expect(stats.committed).toBe(0)
    })

    it('should not affect other topics', () => {
      tracker.track('test1', 0, '100')
      tracker.track('test2', 0, '200')

      tracker.resolve('test1', 0, '100')
      tracker.resolve('test2', 0, '200')

      tracker.clear('test1')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(1)
      expect(committable[0]?.topic).toBe('test2')
    })
  })

  describe('Stats', () => {
    it('should calculate correct stats', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '101')
      tracker.track('test', 0, '102')

      tracker.resolve('test', 0, '100')
      tracker.resolve('test', 0, '101')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(3)
      expect(stats.committed).toBe(2)
      expect(stats.pending).toBe(1)
    })

    it('should return zero stats when empty', () => {
      const stats = tracker.getStats()
      expect(stats.tracked).toBe(0)
      expect(stats.committed).toBe(0)
      expect(stats.pending).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle repeated tracking of same offset', () => {
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '100')
      tracker.track('test', 0, '100')

      const stats = tracker.getStats()
      expect(stats.tracked).toBe(3)
    })

    it('should handle large offset numbers', () => {
      tracker.track('test', 0, '9223372036854775807')
      tracker.resolve('test', 0, '9223372036854775807')

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(1)
      expect(committable[0]?.offset).toBe('9223372036854775807')
    })

    it('should handle many partitions', () => {
      for (let p = 0; p < 100; p++) {
        tracker.track('test', p, String(100 + p))
        tracker.resolve('test', p, String(100 + p))
      }

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(100)
    })

    it('should handle many topics', () => {
      for (let t = 0; t < 50; t++) {
        tracker.track(`topic-${t}`, 0, String(100 + t))
        tracker.resolve(`topic-${t}`, 0, String(100 + t))
      }

      const committable = tracker.getCommittableOffsets()
      expect(committable.length).toBe(50)
    })
  })
})
