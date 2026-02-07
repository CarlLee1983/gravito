import { describe, expect, it, mock } from 'bun:test'
import type { BullMQDriverConfig, BullQueueClient } from '../../src/drivers/BullMQDriver'
import { BullMQDriver } from '../../src/drivers/BullMQDriver'

describe('BullMQDriver', () => {
  const createMockQueue = (): BullQueueClient => ({
    add: mock(async () => ({ id: 'mock-job-id' })),
    getJob: mock(async () => null),
    count: mock(async () => 0),
    process: mock(() => {}),
    on: mock(() => {}),
    off: mock(() => {}),
    pause: mock(async () => {}),
    resume: mock(async () => {}),
    clean: mock(async () => 0),
    close: mock(async () => {}),
    getJobCounts: mock(async () => ({})),
    getDelayedCount: mock(async () => 0),
    getFailedCount: mock(async () => 0),
    getActiveCount: mock(async () => 0),
  })

  describe('Constructor', () => {
    it('should initialize with required config', () => {
      const queue = createMockQueue()
      const config: BullMQDriverConfig = { queue }

      const driver = new BullMQDriver(config)
      expect(driver).toBeDefined()
    })

    it('should throw error if queue is missing', () => {
      const config: any = { queue: null }
      expect(() => new BullMQDriver(config)).toThrow(
        '[BullMQDriver] Bull Queue instance is required.'
      )
    })

    it('should use custom prefix', () => {
      const queue = createMockQueue()
      const driver = new BullMQDriver({ queue, prefix: 'custom:' })
      expect(driver).toBeDefined()
    })
  })

  describe('push', () => {
    it('should push job with basic data', async () => {
      const queue = createMockQueue()
      const driver = new BullMQDriver({ queue })

      const job = {
        id: 'job-1',
        type: 'json' as const,
        data: '{"test": true}',
        createdAt: Date.now(),
      }

      await driver.push('events', job)

      expect(queue.add).toHaveBeenCalled()
    })

    it('should push job with priority', async () => {
      const queue = createMockQueue()
      const driver = new BullMQDriver({ queue })

      const job = {
        id: 'job-1',
        type: 'json' as const,
        data: '{"test": true}',
        createdAt: Date.now(),
        priority: 'high',
      }

      await driver.push('events', job, { priority: 'high' })

      expect(queue.add).toHaveBeenCalled()
    })

    it('should push job with delay', async () => {
      const queue = createMockQueue()
      const driver = new BullMQDriver({ queue })

      const job = {
        id: 'job-1',
        type: 'json' as const,
        data: '{"test": true}',
        createdAt: Date.now(),
        delaySeconds: 30,
      }

      await driver.push('events', job)

      expect(queue.add).toHaveBeenCalled()
    })

    it('should handle push errors', async () => {
      const queue = createMockQueue()
      queue.add = mock(async () => {
        throw new Error('Push failed')
      })
      const driver = new BullMQDriver({ queue })

      const job = {
        id: 'job-1',
        type: 'json' as const,
        data: '{"test": true}',
        createdAt: Date.now(),
      }

      await expect(driver.push('events', job)).rejects.toThrow('Push failed')
    })
  })

  describe('size', () => {
    it('should return queue size', async () => {
      const queue = createMockQueue()
      queue.count = mock(async () => 42)
      const driver = new BullMQDriver({ queue })

      const size = await driver.size('events')
      expect(size).toBe(42)
    })

    it('should return 0 if count fails', async () => {
      const queue = createMockQueue()
      queue.count = mock(async () => {
        throw new Error('Count failed')
      })
      const driver = new BullMQDriver({ queue })

      const size = await driver.size('events')
      expect(size).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear queue', async () => {
      const queue = createMockQueue()
      const cleanMock = mock(async () => 10)
      queue.clean = cleanMock
      const driver = new BullMQDriver({ queue })

      await driver.clear('events')

      expect(cleanMock).toHaveBeenCalled()
    })

    it('should handle clear errors', async () => {
      const queue = createMockQueue()
      queue.clean = mock(async () => {
        throw new Error('Clear failed')
      })
      const driver = new BullMQDriver({ queue })

      await expect(driver.clear('events')).rejects.toThrow('Clear failed')
    })
  })

  describe('stats', () => {
    it('should return queue statistics', async () => {
      const queue = createMockQueue()
      queue.getJobCounts = mock(async () => ({
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 0,
      }))
      queue.getDelayedCount = mock(async () => 0)
      queue.getFailedCount = mock(async () => 1)
      queue.getActiveCount = mock(async () => 2)

      const driver = new BullMQDriver({ queue })

      const stats = await driver.stats('events')

      expect(stats.queue).toBe('events')
      expect(stats.size).toBe(5)
      expect(stats.failed).toBe(1)
      expect(stats.reserved).toBe(2)
    })
  })

  describe('pushMany', () => {
    it('should push multiple jobs', async () => {
      const queue = createMockQueue()
      const driver = new BullMQDriver({ queue })

      const jobs = [
        { id: 'job-1', type: 'json' as const, data: '{}', createdAt: Date.now() },
        { id: 'job-2', type: 'json' as const, data: '{}', createdAt: Date.now() },
      ]

      await driver.pushMany('events', jobs)

      expect(queue.add).toHaveBeenCalled()
    })
  })
})
