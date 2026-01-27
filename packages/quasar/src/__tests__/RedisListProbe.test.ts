import { describe, expect, it } from 'bun:test'
import { RedisListProbe } from '../probes/RedisListProbe'
import { MockRedis } from './mock-redis'

describe('RedisListProbe', () => {
  it('should get list length correctly', async () => {
    const redis = new MockRedis() as any
    const queueName = 'simple-list'

    await redis.rpush(queueName, 'msg1', 'msg2', 'msg3')

    const probe = new RedisListProbe(redis, queueName)
    const snapshot = await probe.getSnapshot()

    expect(snapshot.name).toBe(queueName)
    expect(snapshot.driver).toBe('redis')
    expect(snapshot.size.waiting).toBe(3)
    expect(snapshot.size.active).toBe(0)
    expect(snapshot.size.failed).toBe(0)
    expect(snapshot.size.delayed).toBe(0)
  })

  it('should handle non-existent list', async () => {
    const redis = new MockRedis() as any
    const probe = new RedisListProbe(redis, 'unknown-list')
    const snapshot = await probe.getSnapshot()

    expect(snapshot.size.waiting).toBe(0)
  })
})
