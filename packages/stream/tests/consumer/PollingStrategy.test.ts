import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { PollingStrategy } from '../../src/consumer/PollingStrategy'
import type { QueueManager } from '../../src/QueueManager'

describe('PollingStrategy', () => {
  let mockQueueManager: QueueManager
  let strategy: PollingStrategy
  let mockStats: { active: number }

  beforeEach(() => {
    mockStats = { active: 0 }
    mockQueueManager = {
      getDriver: mock(() => ({})),
      pop: mock(async () => null),
      popMany: mock(async () => []),
      popBlocking: mock(async () => null),
    } as any
  })

  afterEach(async () => {
    if (strategy?.isRunning()) {
      await strategy.stop()
    }
  })

  describe('Lifecycle', () => {
    beforeEach(() => {
      strategy = new PollingStrategy(mockQueueManager, ['default'], 'redis', {
        minPollInterval: 100,
        maxPollInterval: 5000,
        backoffMultiplier: 1.5,
        batchSize: 1,
        useBlocking: false,
        blockingTimeout: 5,
        concurrency: 5,
        stats: mockStats,
        debug: false,
        log: mock(() => {}),
      })
    })

    it('should start successfully', async () => {
      await strategy.start()
      expect(strategy.isRunning()).toBe(true)
      await strategy.stop()
    })

    it('should stop successfully', async () => {
      await strategy.start()
      expect(strategy.isRunning()).toBe(true)
      await strategy.stop()
      expect(strategy.isRunning()).toBe(false)
    })

    it('should not start twice', async () => {
      await strategy.start()
      try {
        await strategy.start()
        expect(true).toBe(false) // Should not reach here
      } catch (err) {
        expect((err as Error).message).toContain('already running')
      }
      await strategy.stop()
    })

    it('should handle stop when not running', async () => {
      // Should not throw
      await strategy.stop()
    })
  })

  describe('Job Fetching', () => {
    beforeEach(() => {
      strategy = new PollingStrategy(mockQueueManager, ['default', 'emails'], 'redis', {
        minPollInterval: 50,
        maxPollInterval: 5000,
        backoffMultiplier: 1.5,
        batchSize: 1,
        useBlocking: false,
        blockingTimeout: 5,
        concurrency: 5,
        stats: mockStats,
        debug: false,
        log: mock(() => {}),
      })
    })

    it('should return empty array when no capacity', async () => {
      mockStats.active = 5 // At capacity
      const jobs = await strategy.fetchJobs()
      expect(jobs).toEqual([])
    })

    it('should return empty array when not running', async () => {
      const jobs = await strategy.fetchJobs()
      expect(jobs).toEqual([])
    })

    it('should handle fetch errors gracefully', async () => {
      await strategy.start()
      ;(mockQueueManager.pop as any).mockRejectedValueOnce(new Error('Fetch failed'))

      mockStats.active = 0
      const jobs = await strategy.fetchJobs()
      expect(jobs).toEqual([])
      await strategy.stop()
    })
  })
})
