import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Set Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should add members to set', async () => {
    mockIORedisInstance.sadd.mockResolvedValueOnce(2)
    expect(await client.sadd('set', 'm1', 'm2')).toBe(2)
    expect(mockIORedisInstance.sadd).toHaveBeenCalledWith('set', 'm1', 'm2')
  })

  it('should remove members from set', async () => {
    mockIORedisInstance.srem.mockResolvedValueOnce(1)
    expect(await client.srem('set', 'm1', 'm2')).toBe(1)
    expect(mockIORedisInstance.srem).toHaveBeenCalledWith('set', 'm1', 'm2')
  })

  it('should get all set members', async () => {
    mockIORedisInstance.smembers.mockResolvedValueOnce(['m1', 'm2', 'm3'])
    expect(await client.smembers('set')).toEqual(['m1', 'm2', 'm3'])
    expect(mockIORedisInstance.smembers).toHaveBeenCalledWith('set')
  })

  it('should check if member exists in set', async () => {
    mockIORedisInstance.sismember.mockResolvedValueOnce(1)
    expect(await client.sismember('set', 'm1')).toBe(1)
    expect(mockIORedisInstance.sismember).toHaveBeenCalledWith('set', 'm1')
  })

  it('should get set cardinality', async () => {
    mockIORedisInstance.scard.mockResolvedValueOnce(3)
    expect(await client.scard('set')).toBe(3)
    expect(mockIORedisInstance.scard).toHaveBeenCalledWith('set')
  })

  it('should pop member from set', async () => {
    mockIORedisInstance.spop.mockResolvedValueOnce('m1')
    expect(await client.spop('set')).toBe('m1')
    expect(mockIORedisInstance.spop).toHaveBeenCalledWith('set')
  })

  it('should pop multiple members from set', async () => {
    mockIORedisInstance.spop.mockResolvedValueOnce(['m1', 'm2'])
    expect(await client.spop('set', 2)).toEqual(['m1', 'm2'])
  })

  it('should get random member from set', async () => {
    mockIORedisInstance.srandmember.mockResolvedValueOnce('m1')
    expect(await client.srandmember('set')).toBe('m1')
    expect(mockIORedisInstance.srandmember).toHaveBeenCalledWith('set')
  })

  it('should get multiple random members from set', async () => {
    mockIORedisInstance.srandmember.mockResolvedValueOnce(['m1', 'm2'])
    expect(await client.srandmember('set', 2)).toEqual(['m1', 'm2'])
  })

  it('should get union of sets', async () => {
    mockIORedisInstance.sunion.mockResolvedValueOnce(['m1', 'm2', 'm3'])
    expect(await client.sunion('set1', 'set2')).toEqual(['m1', 'm2', 'm3'])
    expect(mockIORedisInstance.sunion).toHaveBeenCalledWith('set1', 'set2')
  })

  it('should get intersection of sets', async () => {
    mockIORedisInstance.sinter.mockResolvedValueOnce(['m1'])
    expect(await client.sinter('set1', 'set2')).toEqual(['m1'])
    expect(mockIORedisInstance.sinter).toHaveBeenCalledWith('set1', 'set2')
  })

  it('should get difference of sets', async () => {
    mockIORedisInstance.sdiff.mockResolvedValueOnce(['m1', 'm3'])
    expect(await client.sdiff('set1', 'set2')).toEqual(['m1', 'm3'])
    expect(mockIORedisInstance.sdiff).toHaveBeenCalledWith('set1', 'set2')
  })
})
