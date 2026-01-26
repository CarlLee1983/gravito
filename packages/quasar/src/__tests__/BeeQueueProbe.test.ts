import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BeeQueueProbe } from '../probes/BeeQueueProbe'
import { MockRedis } from './mock-redis'

describe('BeeQueueProbe', () => {
  let redis: any
  const queueName = 'test-bee-queue'
  const prefix = 'bq'

  beforeEach(async () => {
    redis = new MockRedis()
  })

  afterEach(async () => {
    // No cleanup needed
  })

  it('should return correct snapshot for empty queue', async () => {
    const probe = new BeeQueueProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot).toEqual({
      name: queueName,
      driver: 'redis',
      size: {
        waiting: 0,
        active: 0,
        failed: 0,
        delayed: 0, // Bee-Queue doesn't support delayed jobs
      },
    })
  })

  it('should return correct counts for queue with jobs', async () => {
    // Add jobs to different states
    await redis.lpush(`${prefix}:${queueName}:waiting`, 'job1', 'job2', 'job3', 'job4')
    await redis.lpush(`${prefix}:${queueName}:active`, 'job5', 'job6')
    await redis.lpush(`${prefix}:${queueName}:failed`, 'job7')

    const probe = new BeeQueueProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot).toEqual({
      name: queueName,
      driver: 'redis',
      size: {
        waiting: 4,
        active: 2,
        failed: 1,
        delayed: 0,
      },
    })
  })

  it('should handle custom prefix correctly', async () => {
    const customPrefix = 'custom-bq'
    await redis.lpush(`${customPrefix}:${queueName}:waiting`, 'job1', 'job2')

    const probe = new BeeQueueProbe(redis, queueName, customPrefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot.size.waiting).toBe(2)
  })

  it('should always return 0 for delayed jobs', async () => {
    // Even if we manually add delayed jobs, Bee-Queue doesn't support them
    await redis.lpush(`${prefix}:${queueName}:waiting`, 'job1')

    const probe = new BeeQueueProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot.size.delayed).toBe(0)
  })
})
