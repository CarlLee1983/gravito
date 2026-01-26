import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BullMQProbe } from '../probes/BullMQProbe'
import { MockRedis } from './mock-redis'

describe('BullMQProbe', () => {
  let redis: any // MockRedis typed as any to satisfy Redis interface
  const queueName = 'test-bullmq-queue'
  const prefix = 'bull'

  beforeEach(async () => {
    redis = new MockRedis()
    // MockRedis starts empty, no need to clean
  })

  afterEach(async () => {
    // No cleanup needed for in-memory mock
  })

  it('should return correct snapshot for empty queue', async () => {
    const probe = new BullMQProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot).toEqual({
      name: queueName,
      driver: 'redis',
      size: {
        waiting: 0,
        active: 0,
        failed: 0,
        delayed: 0,
      },
    })
  })

  it('should return correct counts for queue with jobs in various states', async () => {
    // Add jobs to different states
    await redis.lpush(`${prefix}:${queueName}:wait`, 'job1', 'job2', 'job3')
    await redis.lpush(`${prefix}:${queueName}:active`, 'job4')
    await redis.zadd(`${prefix}:${queueName}:delayed`, Date.now() + 10000, 'job5')
    await redis.sadd(`${prefix}:${queueName}:failed`, 'job6', 'job7')

    const probe = new BullMQProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot).toEqual({
      name: queueName,
      driver: 'redis',
      size: {
        waiting: 3,
        active: 1,
        failed: 2,
        delayed: 1,
      },
    })
  })

  it('should handle custom prefix correctly', async () => {
    const customPrefix = 'custom-bull'
    await redis.lpush(`${customPrefix}:${queueName}:wait`, 'job1')

    const probe = new BullMQProbe(redis, queueName, customPrefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot.size.waiting).toBe(1)
  })
})
