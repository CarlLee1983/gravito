import { beforeEach, describe, expect, test } from 'bun:test'
import { MemoryDriver } from '../src/drivers/MemoryDriver'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'
import { ClassNameSerializer } from '../src/serializers/ClassNameSerializer'
import { Worker } from '../src/Worker'

// Test Job
class TestJob extends Job {
  constructor(public message: string) {
    super()
  }

  async handle(): Promise<void> {
    // Test logic
  }
}

describe('@gravito/orbit-queue', () => {
  describe('Job', () => {
    test('should create a job with queue configuration', () => {
      const job = new TestJob('test')
      job.onQueue('emails').delay(60)

      expect(job.queueName).toBe('emails')
      expect(job.delaySeconds).toBe(60)
    })

    test('should support fluent API', () => {
      const job = new TestJob('test')
      const result = job.onQueue('default').onConnection('redis').delay(30)

      expect(result).toBe(job)
      expect(job.queueName).toBe('default')
      expect(job.connectionName).toBe('redis')
      expect(job.delaySeconds).toBe(30)
    })
  })

  describe('MemoryDriver', () => {
    test('should push and pop jobs', async () => {
      const driver = new MemoryDriver()
      const job = {
        id: '1',
        type: 'json' as const,
        data: '{"test": "data"}',
        createdAt: Date.now(),
      }

      await driver.push('default', job)
      expect(await driver.size('default')).toBe(1)

      const popped = await driver.pop('default')
      expect(popped).toEqual(job)
      expect(await driver.size('default')).toBe(0)
    })

    test('should support batch operations', async () => {
      const driver = new MemoryDriver()
      const jobs = [
        {
          id: '1',
          type: 'json' as const,
          data: '{"test": "1"}',
          createdAt: Date.now(),
        },
        {
          id: '2',
          type: 'json' as const,
          data: '{"test": "2"}',
          createdAt: Date.now(),
        },
      ]

      await driver.pushMany?.('default', jobs)
      expect(await driver.size('default')).toBe(2)

      const popped = await driver.popMany?.('default', 2)
      expect(popped).toHaveLength(2)
    })
  })

  describe('ClassNameSerializer', () => {
    test('should serialize and deserialize jobs', () => {
      const serializer = new ClassNameSerializer()
      serializer.register(TestJob)

      const job = new TestJob('test message')
      job.onQueue('emails')

      const serialized = serializer.serialize(job)
      expect(serialized.type).toBe('class')
      expect(serialized.className).toBe('TestJob')

      const deserialized = serializer.deserialize(serialized)
      expect(deserialized).toBeInstanceOf(TestJob)
      expect((deserialized as TestJob).message).toBe('test message')
      expect(deserialized.queueName).toBe('emails')
    })
  })

  describe('QueueManager', () => {
    let manager: QueueManager

    beforeEach(() => {
      manager = new QueueManager({
        default: 'default',
        connections: {
          default: { driver: 'memory' },
        },
        defaultSerializer: 'class',
      })
      // Register Job class
      manager.registerJobClasses([TestJob])
    })

    test('should push and pop jobs', async () => {
      const job = new TestJob('test')
      await manager.push(job)

      const popped = await manager.pop()
      expect(popped).toBeDefined()
      expect(popped).toBeInstanceOf(TestJob)
      expect((popped as TestJob).message).toBe('test')
    })

    test('should get queue size', async () => {
      const job1 = new TestJob('test1')
      const job2 = new TestJob('test2')

      await manager.push(job1)
      await manager.push(job2)

      expect(await manager.size()).toBe(2)
    })

    test('should clear queue', async () => {
      const job = new TestJob('test')
      await manager.push(job)
      expect(await manager.size()).toBe(1)

      await manager.clear()
      expect(await manager.size()).toBe(0)
    })
  })

  describe('Worker', () => {
    test('should process job successfully', async () => {
      let handled = false
      class SuccessJob extends Job {
        async handle(): Promise<void> {
          handled = true
        }
      }

      const worker = new Worker()
      await worker.process(new SuccessJob())

      expect(handled).toBe(true)
    })

    test('should retry on failure', async () => {
      let attempts = 0
      class RetryJob extends Job {
        async handle(): Promise<void> {
          attempts++
          if (attempts < 3) {
            throw new Error('Failed')
          }
        }
      }

      const worker = new Worker({ maxAttempts: 3 })
      await worker.process(new RetryJob())

      expect(attempts).toBe(3)
    })
  })
})
