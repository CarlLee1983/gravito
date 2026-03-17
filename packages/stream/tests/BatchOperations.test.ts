import { describe, expect, it, mock } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'

class TestJob extends Job {
  async handle() {}
}

describe('Batch Operations', () => {
  describe('QueueManager.pushMany', () => {
    it('should respect batchSize', async () => {
      const manager = new QueueManager()
      const driver = manager.getDriver('default')

      let callCount = 0
      const batches: number[] = []

      // Mock pushMany on the driver
      driver.pushMany = async (_queue, jobs) => {
        callCount++
        batches.push(jobs.length)
      }

      const jobs = Array.from({ length: 25 }, () => new TestJob())

      await manager.pushMany(jobs, { batchSize: 10 })

      expect(callCount).toBe(3)
      expect(batches).toEqual([10, 10, 5])
    })

    it('should work with concurrency', async () => {
      const manager = new QueueManager()
      const driver = manager.getDriver('default')
      const batches: number[] = []
      let callCount = 0

      driver.pushMany = async (_queue, jobs) => {
        callCount++
        batches.push(jobs.length)
        await new Promise((r) => setTimeout(r, 10))
      }

      const jobs = Array.from({ length: 20 }, () => new TestJob())
      await manager.pushMany(jobs, { batchSize: 5, concurrency: 2 })

      expect(callCount).toBe(4)
      expect(batches).toEqual([5, 5, 5, 5])
    })
  })

  describe('RedisDriver.popMany', () => {
    it('should use rpop count when available', async () => {
      const mockClient = {
        defineCommand: () => {},
        rpop: mock((_key: string, count?: number) => {
          if (count) {
            return Promise.resolve([
              JSON.stringify({ id: '1', data: 'foo' }),
              JSON.stringify({ id: '2', data: 'bar' }),
            ])
          }
          return Promise.resolve(null)
        }),
        get: () => Promise.resolve(null), // Not paused
      }

      const driver = new RedisDriver({ client: mockClient as any })
      const jobs = await driver.popMany('default', 2)

      expect(jobs.length).toBe(2)
      expect(jobs[0].id).toBe('1')
      expect(jobs[1].id).toBe('2')
    })

    it('should fallback to pipeline if rpop count fails', async () => {
      const mockPipeline = {
        rpop: mock(),
        exec: mock(() =>
          Promise.resolve([
            [null, JSON.stringify({ id: '1', data: 'foo' })],
            [null, JSON.stringify({ id: '2', data: 'bar' })],
          ])
        ),
      }

      const mockClient = {
        defineCommand: () => {},
        rpop: mock((_key: string, count?: number) => {
          if (count) {
            return Promise.reject(new Error('ERR syntax error')) // Simulate old Redis
          }
          return Promise.resolve(null)
        }),
        pipeline: () => mockPipeline,
        get: () => Promise.resolve(null),
      }

      const driver = new RedisDriver({ client: mockClient as any })
      const jobs = await driver.popMany('default', 2)

      expect(jobs.length).toBe(2)
      expect(jobs[0].id).toBe('1')
      expect(mockPipeline.rpop).toHaveBeenCalledTimes(2)
    })
  })
})
