import { describe, expect, it } from 'bun:test'
import { BullProbe } from '../probes/BullProbe'
import { MockRedis } from './mock-redis'

describe('BullProbe', () => {
  it('should get queue snapshot correctly', async () => {
    const redis = new MockRedis() as any
    const queueName = 'test-queue'
    const prefix = 'bull'

    // Setup mock data
    // Bull keys: bull:test-queue:waiting, active, delayed, failed
    await redis.lpush(`${prefix}:${queueName}:waiting`, 'job1', 'job2')
    await redis.lpush(`${prefix}:${queueName}:active`, 'job3')
    await redis.zadd(`${prefix}:${queueName}:delayed`, 100, 'job4')
    await redis.zadd(`${prefix}:${prefix}:delayed`, 200, 'job5') // Wrong prefix test
    await redis.zadd(`${prefix}:${queueName}:failed`, 300, 'job6')
    await redis.zadd(`${prefix}:${queueName}:failed`, 400, 'job7')
    await redis.zadd(`${prefix}:${queueName}:failed`, 500, 'job8')

    const probe = new BullProbe(redis, queueName, prefix)
    const snapshot = await probe.getSnapshot()

    expect(snapshot.name).toBe(queueName)
    expect(snapshot.driver).toBe('redis')
    expect(snapshot.size.waiting).toBe(2)
    expect(snapshot.size.active).toBe(1)
    expect(snapshot.size.delayed).toBe(1)
    expect(snapshot.size.failed).toBe(3)
  })

  it('should handle empty queues', async () => {
    const redis = new MockRedis() as any
    const probe = new BullProbe(redis, 'empty-queue')
    const snapshot = await probe.getSnapshot()

    expect(snapshot.size.waiting).toBe(0)
    expect(snapshot.size.active).toBe(0)
    expect(snapshot.size.delayed).toBe(0)
    expect(snapshot.size.failed).toBe(0)
  })
})
