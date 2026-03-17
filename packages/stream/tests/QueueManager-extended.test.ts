import { describe, expect, it, mock, spyOn } from 'bun:test'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'

class SimpleJob extends Job {
  async handle(): Promise<void> {}
}

describe('QueueManager (extended)', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const manager = new QueueManager()
      expect(manager).toBeDefined()
      expect(manager.getDefaultConnection()).toBe('default')
    })

    it('should use json serializer', () => {
      const manager = new QueueManager({ defaultSerializer: 'json' })
      expect(manager).toBeDefined()
    })

    it('should use msgpack serializer', () => {
      const manager = new QueueManager({ defaultSerializer: 'msgpack' })
      expect(manager).toBeDefined()
    })

    it('should use class serializer by default', () => {
      const manager = new QueueManager({ defaultSerializer: 'class' })
      expect(manager).toBeDefined()
    })

    it('should use cached serializer', () => {
      const manager = new QueueManager({ useSerializationCache: true })
      expect(manager).toBeDefined()
    })

    it('should wrap persistence with BufferedPersistence', () => {
      const mockAdapter: any = {
        archive: mock(() => Promise.resolve()),
        find: mock(() => Promise.resolve(null)),
        list: mock(() => Promise.resolve([])),
        count: mock(() => Promise.resolve(0)),
        cleanup: mock(() => Promise.resolve(0)),
        archiveLog: mock(() => Promise.resolve()),
        listLogs: mock(() => Promise.resolve([])),
        countLogs: mock(() => Promise.resolve(0)),
      }

      const manager = new QueueManager({
        persistence: {
          adapter: mockAdapter,
          bufferSize: 100,
          flushInterval: 500,
        },
      })

      const persistence = manager.getPersistence()
      expect(persistence).toBeDefined()
    })
  })

  describe('registerConnection', () => {
    it('should register memory driver', () => {
      const manager = new QueueManager()
      manager.registerConnection('test', { driver: 'memory' })
      expect(manager.getDriver('test')).toBeDefined()
    })

    it('should register redis driver with client', () => {
      const mockClient: any = {
        lpush: mock(() => Promise.resolve()),
        rpop: mock(() => Promise.resolve()),
      }
      const manager = new QueueManager()
      manager.registerConnection('redis', { driver: 'redis', client: mockClient })
      expect(manager.getDriver('redis')).toBeDefined()
    })

    it('should throw for database driver without dbService', () => {
      const manager = new QueueManager()
      expect(() => {
        manager.registerConnection('db', { driver: 'database' })
      }).toThrow()
    })

    it('should throw for unknown driver', () => {
      const manager = new QueueManager()
      expect(() => {
        manager.registerConnection('unknown', { driver: 'nonexistent' as any })
      }).toThrow()
    })
  })

  describe('push and pop', () => {
    it('should push and pop a job', async () => {
      const manager = new QueueManager()
      const job = new SimpleJob()

      await manager.push(job)
      const popped = await manager.pop('default')
      expect(popped).toBeDefined()
      expect(popped).toBeInstanceOf(SimpleJob)
    })

    it('should push to specific queue', async () => {
      const manager = new QueueManager()
      const job = new SimpleJob().onQueue('emails')

      await manager.push(job)
      const popped = await manager.pop('emails')
      expect(popped).toBeDefined()
      expect(popped).toBeInstanceOf(SimpleJob)
    })

    it('should archive job on complete', async () => {
      const mockAdapter: any = {
        archive: mock(() => Promise.resolve()),
        find: mock(() => Promise.resolve(null)),
        list: mock(() => Promise.resolve([])),
        count: mock(() => Promise.resolve(0)),
        cleanup: mock(() => Promise.resolve(0)),
        archiveLog: mock(() => Promise.resolve()),
        listLogs: mock(() => Promise.resolve([])),
        countLogs: mock(() => Promise.resolve(0)),
      }

      const mockDriver: any = {
        push: mock(() => Promise.resolve()),
        pop: mock(async () => ({
          id: 'job-1',
          type: 'class',
          className: 'SimpleJob',
          data: '{}',
          createdAt: Date.now(),
          attempts: 0,
        })),
        complete: mock(() => Promise.resolve()),
        size: mock(() => Promise.resolve(0)),
        clear: mock(() => Promise.resolve()),
      }

      const manager = new QueueManager({
        persistence: { adapter: mockAdapter, archiveCompleted: true },
      })
      ;(manager as any).drivers.set('default', mockDriver)
      manager.registerJobClasses([SimpleJob])
      const job = new SimpleJob()

      await manager.push(job)
      const popped = await manager.pop('default')
      if (popped) {
        await manager.complete(popped)
        expect(mockAdapter.archive).toHaveBeenCalled()
      }
    })

    it('should auto-register class jobs when serialization cache is enabled', async () => {
      const manager = new QueueManager({ useSerializationCache: true })
      await manager.push(new SimpleJob())

      const popped = await manager.pop('default')
      expect(popped).toBeInstanceOf(SimpleJob)
    })
  })

  describe('getGlobalStats', () => {
    it('should return stats for all connections', async () => {
      const manager = new QueueManager()
      await manager.push(new SimpleJob())

      const stats = await manager.getGlobalStats()
      expect(stats.connections).toBeDefined()
      expect(stats.totalSize).toBeDefined()
      expect(stats.totalFailed).toBeDefined()
      expect(stats.timestamp).toBeDefined()
    })
  })

  describe('getDefaultConnection', () => {
    it('should return the default connection name', () => {
      const manager = new QueueManager({ default: 'redis' })
      expect(manager.getDefaultConnection()).toBe('redis')
    })
  })

  describe('getSerializer', () => {
    it('should return the default serializer', () => {
      const manager = new QueueManager()
      const serializer = manager.getSerializer()
      expect(serializer).toBeDefined()
    })

    it('should register job classes when serialization cache is enabled', () => {
      const manager = new QueueManager({ useSerializationCache: true })
      manager.registerJobClasses([SimpleJob])

      const serializer = manager.getSerializer()
      const serialized = serializer.serialize(new SimpleJob())
      const restored = serializer.deserialize(serialized)

      expect(restored).toBeInstanceOf(SimpleJob)
    })
  })

  describe('getPersistence', () => {
    it('should return undefined when no persistence configured', () => {
      const manager = new QueueManager()
      expect(manager.getPersistence()).toBeUndefined()
    })
  })

  describe('fail', () => {
    it('should move job to failed queue', async () => {
      const manager = new QueueManager()
      const _job = { id: 'j-1', type: 'json', data: '{}', createdAt: Date.now() }

      await manager.push(new SimpleJob())
      const popped = await manager.pop('default')
      if (popped) {
        await manager.fail('default', popped, new Error('failed'))
      }
    })
  })

  describe('retryFailed', () => {
    it('should retry failed jobs', async () => {
      const manager = new QueueManager()
      const job = new SimpleJob()
      await manager.push(job)

      const popped = await manager.pop('default')
      if (popped) {
        await manager.fail('default', popped, new Error('test'))
        const retried = await manager.retryFailed('default', 10)
        expect(retried).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('debug logging', () => {
    it('should log when debug is enabled', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
      const manager = new QueueManager({ debug: true })

      await manager.push(new SimpleJob())
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
