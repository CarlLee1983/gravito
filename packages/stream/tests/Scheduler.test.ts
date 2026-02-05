import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { QueueManager } from '../src/QueueManager'
import { Scheduler } from '../src/Scheduler'

function createMockRedisClient() {
  const pipeline = {
    hset: mock(() => pipeline),
    zadd: mock(() => pipeline),
    del: mock(() => pipeline),
    zrem: mock(() => pipeline),
    exec: mock(() => Promise.resolve([])),
  }

  return {
    pipeline: mock(() => pipeline),
    zrange: mock(() => Promise.resolve([])),
    zrangebyscore: mock(() => Promise.resolve([])),
    hgetall: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve('OK')),
    eval: mock(() => Promise.resolve(1)),
    del: mock(() => Promise.resolve(1)),
    _pipeline: pipeline,
  }
}

function createMockQueueManager(client: any) {
  const driver: any = {
    client,
    push: mock(() => Promise.resolve()),
  }

  const serializer: any = {
    serialize: mock((job: any) => job),
    deserialize: mock((data: any) => data),
  }

  return {
    getDriver: mock(() => driver),
    getDefaultConnection: mock(() => 'redis'),
    getSerializer: mock(() => serializer),
    push: mock(() => Promise.resolve()),
    _driver: driver,
    _serializer: serializer,
  } as unknown as QueueManager & { _driver: any; _serializer: any }
}

describe('Scheduler', () => {
  let scheduler: Scheduler
  let client: ReturnType<typeof createMockRedisClient>
  let manager: ReturnType<typeof createMockQueueManager>

  beforeEach(() => {
    client = createMockRedisClient()
    manager = createMockQueueManager(client)
    scheduler = new Scheduler(manager as any, {
      prefix: 'test:',
      lockTtl: 1000,
      lockRefreshInterval: 300,
      lockRetryCount: 0,
      lockRetryDelay: 100,
      tickInterval: 100,
      leaderTtl: 500,
    })
  })

  afterEach(async () => {
    await scheduler.stop()
  })

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const s = new Scheduler(manager as any)
      expect(s).toBeDefined()
    })
  })

  describe('register', () => {
    it('should store scheduled job config in Redis', async () => {
      await scheduler.register({
        id: 'daily-report',
        cron: '0 0 * * *',
        queue: 'reports',
        job: { id: 'job-1', type: 'json', data: '{}', createdAt: Date.now() },
      })

      expect(client.pipeline).toHaveBeenCalled()
      expect(client._pipeline.hset).toHaveBeenCalled()
      expect(client._pipeline.zadd).toHaveBeenCalled()
      expect(client._pipeline.exec).toHaveBeenCalled()
    })

    it('should throw when pipeline is not supported', async () => {
      client.pipeline = undefined as any
      await expect(
        scheduler.register({
          id: 'test',
          cron: '* * * * *',
          queue: 'default',
          job: { id: '1', type: 'json', data: '{}', createdAt: Date.now() },
        })
      ).rejects.toThrow('pipeline')
    })
  })

  describe('remove', () => {
    it('should delete schedule from Redis', async () => {
      await scheduler.remove('daily-report')
      expect(client.pipeline).toHaveBeenCalled()
      expect(client._pipeline.del).toHaveBeenCalled()
      expect(client._pipeline.zrem).toHaveBeenCalled()
    })

    it('should throw when pipeline is not supported', async () => {
      client.pipeline = undefined as any
      await expect(scheduler.remove('test')).rejects.toThrow('pipeline')
    })
  })

  describe('list', () => {
    it('should return empty array when no schedules exist', async () => {
      const result = await scheduler.list()
      expect(result).toEqual([])
    })

    it('should parse and return schedule configs', async () => {
      client.zrange.mockResolvedValueOnce(['daily-report'])
      client.hgetall.mockResolvedValueOnce({
        id: 'daily-report',
        cron: '0 0 * * *',
        queue: 'reports',
        job: '{"id":"job-1","type":"json","data":"{}","createdAt":1000}',
        enabled: 'true',
        lastRun: '1000',
        nextRun: '2000',
      })

      const result = await scheduler.list()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('daily-report')
      expect(result[0].enabled).toBe(true)
      expect(result[0].lastRun).toBe(1000)
      expect(result[0].nextRun).toBe(2000)
    })

    it('should skip entries without id', async () => {
      client.zrange.mockResolvedValueOnce(['empty'])
      client.hgetall.mockResolvedValueOnce({})
      const result = await scheduler.list()
      expect(result).toHaveLength(0)
    })

    it('should handle null hgetall result', async () => {
      client.zrange.mockResolvedValueOnce(['missing'])
      client.hgetall.mockResolvedValueOnce(null)
      const result = await scheduler.list()
      expect(result).toHaveLength(0)
    })

    it('should throw when zrange is not supported', async () => {
      client.zrange = undefined as any
      await expect(scheduler.list()).rejects.toThrow('zrange')
    })
  })

  describe('tick', () => {
    it('should return 0 when no jobs are due', async () => {
      client.zrangebyscore.mockResolvedValueOnce([])
      const result = await scheduler.tick()
      expect(result).toBe(0)
    })

    it('should throw when zrangebyscore is not supported', async () => {
      client.zrangebyscore = undefined as any
      await expect(scheduler.tick()).rejects.toThrow('zrangebyscore')
    })

    it('should process due jobs', async () => {
      client.zrangebyscore.mockResolvedValueOnce(['job-due'])
      client.hgetall.mockResolvedValueOnce({
        id: 'job-due',
        cron: '* * * * *',
        queue: 'default',
        job: '{"id":"j-1","type":"json","data":"{}","createdAt":1000}',
        enabled: 'true',
      })

      const result = await scheduler.tick()
      expect(result).toBe(1)
      expect(manager._driver.push).toHaveBeenCalled()
    })

    it('should skip disabled jobs', async () => {
      client.zrangebyscore.mockResolvedValueOnce(['disabled-job'])
      client.hgetall.mockResolvedValueOnce({
        id: 'disabled-job',
        cron: '* * * * *',
        queue: 'default',
        job: '{"id":"j-1","type":"json","data":"{}","createdAt":1000}',
        enabled: 'false',
      })

      const result = await scheduler.tick()
      expect(result).toBe(0)
    })

    it('should handle job processing errors gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      client.zrangebyscore.mockResolvedValueOnce(['error-job'])
      client.hgetall.mockResolvedValueOnce({
        id: 'error-job',
        cron: '* * * * *',
        queue: 'default',
        job: 'invalid-json{{{',
        enabled: 'true',
      })

      const result = await scheduler.tick()
      expect(result).toBe(0)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should use connection from job data when available', async () => {
      client.zrangebyscore.mockResolvedValueOnce(['conn-job'])
      client.hgetall.mockResolvedValueOnce({
        id: 'conn-job',
        cron: '* * * * *',
        queue: 'special',
        connection: 'custom',
        job: '{"id":"j-2","type":"json","data":"{}","createdAt":1000}',
        enabled: 'true',
      })

      const result = await scheduler.tick()
      expect(result).toBe(1)
      expect((manager as any).getDriver).toHaveBeenCalledWith('custom')
    })
  })

  describe('start and stop', () => {
    it('should start and stop the scheduler', async () => {
      scheduler.start()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await scheduler.stop()
      expect(scheduler).toBeDefined()
    })

    it('should skip start when already running', async () => {
      scheduler.start()
      await new Promise((resolve) => setTimeout(resolve, 20))
      await scheduler.start() // should return immediately
      await scheduler.stop()
    })
  })

  describe('runNow', () => {
    it('should immediately push a scheduled job', async () => {
      client.hgetall.mockResolvedValueOnce({
        id: 'now-job',
        job: '{"id":"j-now","type":"json","data":"{}","createdAt":1000}',
      })

      await scheduler.runNow('now-job')
      expect(manager.push).toHaveBeenCalled()
    })

    it('should do nothing for non-existent jobs', async () => {
      client.hgetall.mockResolvedValueOnce(null)
      await scheduler.runNow('missing')
      expect(manager.push).not.toHaveBeenCalled()
    })

    it('should skip when hgetall returns empty data', async () => {
      client.hgetall.mockResolvedValueOnce({})
      await scheduler.runNow('empty')
      expect(manager.push).not.toHaveBeenCalled()
    })
  })
})
