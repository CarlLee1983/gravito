import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Redis } from 'ioredis'
import { BullMQProbe } from '../probes/BullMQProbe'

describe('BullMQProbe', () => {
  let redis: Redis
  const queueName = 'test-bullmq-queue'
  const prefix = 'bull'

  beforeEach(async () => {
    redis = new Redis('redis://localhost:6379')
    // Clean up any existing test data
    const keys = await redis.keys(`${prefix}:${queueName}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  afterEach(async () => {
    // Clean up
    const keys = await redis.keys(`${prefix}:${queueName}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    await redis.quit()
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

    // Clean up custom prefix
    await redis.del(`${customPrefix}:${queueName}:wait`)
  })
})
