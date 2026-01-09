import { describe, expect, test } from 'bun:test'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'
import { JsonSerializer } from '../src/serializers/JsonSerializer'
import { Worker } from '../src/Worker'

class SimpleJob extends Job {
  async handle(): Promise<void> {}
}

describe('JsonSerializer', () => {
  test('serializes and deserializes jobs with properties', () => {
    const serializer = new JsonSerializer()
    const job = new SimpleJob()
    job.onQueue('emails').onConnection('redis').delay(10)
    job.attempts = 2
    job.maxAttempts = 5

    const serialized = serializer.serialize(job)
    expect(serialized.type).toBe('json')
    expect(serialized.delaySeconds).toBe(10)
    expect(serialized.attempts).toBe(2)
    expect(serialized.maxAttempts).toBe(5)

    const deserialized = serializer.deserialize(serialized)
    expect((deserialized as any).queueName).toBe('emails')
    expect((deserialized as any).connectionName).toBe('redis')
  })

  test('throws on invalid serialization type', () => {
    const serializer = new JsonSerializer()
    expect(() =>
      serializer.deserialize({
        id: '1',
        type: 'class',
        data: '{}',
        createdAt: Date.now(),
      } as any)
    ).toThrow('Invalid serialization type')
  })
})

describe('QueueManager edge cases', () => {
  test('throws when driver is missing', () => {
    const manager = new QueueManager()
    expect(() => manager.getDriver('missing')).toThrow('Connection "missing" not found')
  })

  test('throws when serializer is missing', () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    expect(() => manager.getSerializer('missing')).toThrow('Serializer "missing" not found')
  })

  test('throws when driver type is unsupported', () => {
    expect(
      () =>
        new QueueManager({
          connections: {
            bad: { driver: 'unknown' },
          },
        })
    ).toThrow('not supported')
  })
})

describe('Worker edge cases', () => {
  test('calls failure handlers and rethrows', async () => {
    let failedCalled = false
    let onFailedCalled = false

    class FailingJob extends Job {
      async handle(): Promise<void> {
        throw new Error('boom')
      }

      async failed(): Promise<void> {
        failedCalled = true
        throw new Error('failed handler')
      }
    }

    const worker = new Worker({
      maxAttempts: 1,
      onFailed: async () => {
        onFailedCalled = true
        throw new Error('onFailed handler')
      },
    })

    await expect(worker.process(new FailingJob())).rejects.toThrow('boom')
    expect(failedCalled).toBe(true)
    expect(onFailedCalled).toBe(true)
  })

  test('times out when job does not resolve', async () => {
    class SlowJob extends Job {
      async handle(): Promise<void> {
        return await new Promise(() => {})
      }
    }

    const worker = new Worker({ timeout: 0.001 })
    await expect(worker.process(new SlowJob())).rejects.toThrow('Job timeout')
  })
})

describe('QueueManager pushMany fallback', () => {
  test('skips pushMany on empty list', async () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    await manager.pushMany([])
    expect(await manager.size()).toBe(0)
  })

  test('falls back to pushing one-by-one when driver lacks pushMany', async () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    const driver = manager.getDriver('default') as any
    delete driver.pushMany

    const jobA = new SimpleJob()
    const jobB = new SimpleJob()

    await manager.pushMany([jobA, jobB])
    expect(await manager.size()).toBe(2)
  })

  test('returns null when deserialization fails', async () => {
    const manager = new QueueManager({ defaultSerializer: 'json' })
    const driver = manager.getDriver('default')

    await driver.push('default', {
      id: 'bad',
      type: 'class',
      data: '{}',
      createdAt: Date.now(),
    } as any)

    const serializer = {
      serialize: () => ({}) as any,
      deserialize: () => {
        throw new Error('bad')
      },
    }
    ;(manager as any).defaultSerializer = serializer

    const job = await manager.pop()
    expect(job).toBeNull()
  })
})
