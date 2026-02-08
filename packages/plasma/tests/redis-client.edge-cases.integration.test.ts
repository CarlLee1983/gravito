import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Edge Cases', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should handle set with all options combined', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', 'value', { ex: 60, nx: true, keepttl: false })
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should handle zadd with multiple scores', async () => {
    mockIORedisInstance.zadd.mockResolvedValueOnce(3)
    await client.zadd(
      'zset',
      { score: 1, member: 'm1' },
      { score: 2, member: 'm2' },
      { score: 3, member: 'm3' }
    )
    expect(mockIORedisInstance.zadd).toHaveBeenCalled()
  })

  it('should handle large key batch operations', async () => {
    const keys = Array.from({ length: 100 }, (_, i) => `k${i}`)
    mockIORedisInstance.del.mockResolvedValueOnce(100)
    await client.del(...keys)
    expect(mockIORedisInstance.del).toHaveBeenCalled()
  })

  it('should handle large value operations', async () => {
    const largeValue = 'x'.repeat(10000)
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('largekey', largeValue)
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should handle special characters in keys', async () => {
    mockIORedisInstance.get.mockResolvedValueOnce('value')
    await client.get('key:with:colons:and-dashes_and_underscores')
    expect(mockIORedisInstance.get).toHaveBeenCalled()
  })

  it('should handle empty string values', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce('OK')
    await client.set('key', '')
    expect(mockIORedisInstance.call).toHaveBeenCalled()
  })

  it('should handle zero as value', async () => {
    mockIORedisInstance.incr.mockResolvedValueOnce(0)
    expect(await client.incr('counter')).toBe(0)
  })

  it('should handle negative numbers in operations', async () => {
    mockIORedisInstance.decrby.mockResolvedValueOnce(-5)
    expect(await client.decrby('counter', 5)).toBe(-5)
  })

  it('should handle very large scores in sorted sets', async () => {
    mockIORedisInstance.zadd.mockResolvedValueOnce(1)
    await client.zadd('zset', { score: Number.MAX_SAFE_INTEGER, member: 'm' })
    expect(mockIORedisInstance.zadd).toHaveBeenCalled()
  })

  it('should handle spop with count equal to set size', async () => {
    mockIORedisInstance.spop.mockResolvedValueOnce(['m1', 'm2', 'm3'])
    const result = await client.spop('set', 3)
    expect(Array.isArray(result)).toBe(true)
  })
})
