import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - TTL Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should set expiration in seconds', async () => {
    mockIORedisInstance.expire.mockResolvedValueOnce(1)
    expect(await client.expire('key', 60)).toBe(1)
    expect(mockIORedisInstance.expire).toHaveBeenCalledWith('key', 60)
  })

  it('should set expiration at timestamp', async () => {
    mockIORedisInstance.expireat.mockResolvedValueOnce(1)
    const timestamp = Math.floor(Date.now() / 1000) + 3600
    expect(await client.expireat('key', timestamp)).toBe(1)
    expect(mockIORedisInstance.expireat).toHaveBeenCalledWith('key', timestamp)
  })

  it('should set expiration in milliseconds', async () => {
    mockIORedisInstance.pexpire.mockResolvedValueOnce(1)
    expect(await client.pexpire('key', 60000)).toBe(1)
    expect(mockIORedisInstance.pexpire).toHaveBeenCalledWith('key', 60000)
  })

  it('should get TTL in seconds', async () => {
    mockIORedisInstance.ttl.mockResolvedValueOnce(55)
    expect(await client.ttl('key')).toBe(55)
    expect(mockIORedisInstance.ttl).toHaveBeenCalledWith('key')
  })

  it('should get TTL in milliseconds', async () => {
    mockIORedisInstance.pttl.mockResolvedValueOnce(55000)
    expect(await client.pttl('key')).toBe(55000)
    expect(mockIORedisInstance.pttl).toHaveBeenCalledWith('key')
  })

  it('should remove expiration', async () => {
    mockIORedisInstance.persist.mockResolvedValueOnce(1)
    expect(await client.persist('key')).toBe(1)
    expect(mockIORedisInstance.persist).toHaveBeenCalledWith('key')
  })
})
