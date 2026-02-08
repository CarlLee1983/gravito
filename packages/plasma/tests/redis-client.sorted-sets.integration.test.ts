import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Sorted Set Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should add members to sorted set', async () => {
    mockIORedisInstance.zadd.mockResolvedValueOnce(2)
    expect(await client.zadd('zset', { score: 1, member: 'm1' }, { score: 2, member: 'm2' })).toBe(
      2
    )
  })

  it('should remove members from sorted set', async () => {
    mockIORedisInstance.zrem.mockResolvedValueOnce(1)
    expect(await client.zrem('zset', 'm1', 'm2')).toBe(1)
    expect(mockIORedisInstance.zrem).toHaveBeenCalledWith('zset', 'm1', 'm2')
  })

  it('should get score of member in sorted set', async () => {
    mockIORedisInstance.zscore.mockResolvedValueOnce('1.5')
    expect(await client.zscore('zset', 'm1')).toBe('1.5')
    expect(mockIORedisInstance.zscore).toHaveBeenCalledWith('zset', 'm1')
  })

  it('should get rank of member in sorted set', async () => {
    mockIORedisInstance.zrank.mockResolvedValueOnce(1)
    expect(await client.zrank('zset', 'm1')).toBe(1)
    expect(mockIORedisInstance.zrank).toHaveBeenCalledWith('zset', 'm1')
  })

  it('should get reverse rank of member in sorted set', async () => {
    mockIORedisInstance.zrevrank.mockResolvedValueOnce(1)
    expect(await client.zrevrank('zset', 'm1')).toBe(1)
    expect(mockIORedisInstance.zrevrank).toHaveBeenCalledWith('zset', 'm1')
  })

  it('should get range of members by rank', async () => {
    mockIORedisInstance.zrange.mockResolvedValueOnce(['m1', 'm2', 'm3'])
    expect(await client.zrange('zset', 0, 2)).toEqual(['m1', 'm2', 'm3'])
    expect(mockIORedisInstance.zrange).toHaveBeenCalledWith('zset', 0, 2)
  })

  it('should get range with scores', async () => {
    mockIORedisInstance.zrange.mockResolvedValueOnce(['m1', '1', 'm2', '2'])
    expect(await client.zrange('zset', 0, 2, { withScores: true })).toEqual(['m1', '1', 'm2', '2'])
  })

  it('should get reverse range by rank', async () => {
    mockIORedisInstance.zrevrange.mockResolvedValueOnce(['m3', 'm2', 'm1'])
    expect(await client.zrevrange('zset', 0, 2)).toEqual(['m3', 'm2', 'm1'])
    expect(mockIORedisInstance.zrevrange).toHaveBeenCalledWith('zset', 0, 2)
  })

  it('should get cardinality of sorted set', async () => {
    mockIORedisInstance.zcard.mockResolvedValueOnce(3)
    expect(await client.zcard('zset')).toBe(3)
    expect(mockIORedisInstance.zcard).toHaveBeenCalledWith('zset')
  })

  it('should count members in score range', async () => {
    mockIORedisInstance.zcount.mockResolvedValueOnce(2)
    expect(await client.zcount('zset', 1, 2)).toBe(2)
    expect(mockIORedisInstance.zcount).toHaveBeenCalledWith('zset', 1, 2)
  })

  it('should increment score of member in sorted set', async () => {
    mockIORedisInstance.zincrby.mockResolvedValueOnce('3.5')
    expect(await client.zincrby('zset', 1.5, 'm1')).toBe('3.5')
    expect(mockIORedisInstance.zincrby).toHaveBeenCalledWith('zset', 1.5, 'm1')
  })
})
