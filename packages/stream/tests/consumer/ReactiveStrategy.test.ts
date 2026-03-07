import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { ReactiveStrategy } from '../../src/consumer/ReactiveStrategy'
import type { QueueManager } from '../../src/QueueManager'

describe('ReactiveStrategy', () => {
  let mockQueueManager: QueueManager
  let strategy: ReactiveStrategy
  let mockStats: { active: number }

  beforeEach(() => {
    mockStats = { active: 0 }
    const mockDriver = {
      enableNotifications: mock(async () => {}),
      disableNotifications: mock(async () => {}),
      onNotify: mock(async () => {}),
    }
    mockQueueManager = {
      getDriver: mock(() => mockDriver),
      pop: mock(async () => null),
      popMany: mock(async () => []),
    } as any

    strategy = new ReactiveStrategy(mockQueueManager, ['default'], 'redis', {
      concurrency: 5,
      batchSize: 1,
      stats: mockStats,
      reactivePollingFallback: 1000,
      debug: false,
      log: mock(() => {}),
    })
  })

  afterEach(async () => {
    if (strategy.isRunning()) {
      await strategy.stop()
    }
  })

  describe('Lifecycle', () => {
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

  describe('Notification Handling', () => {
    it('should enable notifications on start', async () => {
      const driver = mockQueueManager.getDriver('redis')
      const enableSpy = mock(async () => {})
      driver.enableNotifications = enableSpy

      await strategy.start()
      expect(enableSpy).toHaveBeenCalled()
      await strategy.stop()
    })

    it('should register notification listener', async () => {
      const driver = mockQueueManager.getDriver('redis')
      const notifySpy = mock(async () => {})
      driver.onNotify = notifySpy

      await strategy.start()
      expect(notifySpy).toHaveBeenCalledWith(['default'], expect.any(Function))
      await strategy.stop()
    })

    it('should disable notifications on stop', async () => {
      const driver = mockQueueManager.getDriver('redis')
      const disableSpy = mock(async () => {})
      driver.disableNotifications = disableSpy

      await strategy.start()
      await strategy.stop()
      expect(disableSpy).toHaveBeenCalled()
    })
  })

  describe('Job Fetching', () => {
    it('should return empty array when no capacity', async () => {
      mockStats.active = 5 // At capacity
      const jobs = await strategy.fetchJobs()
      expect(jobs).toEqual([])
    })

    it('should return empty array when not running', async () => {
      const jobs = await strategy.fetchJobs()
      expect(jobs).toEqual([])
    })
  })
})
