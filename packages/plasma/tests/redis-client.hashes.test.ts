import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Hash Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should get a hash field', async () => {
    mockIORedisInstance.hget.mockResolvedValueOnce('fieldvalue')
    expect(await client.hget('hash', 'field')).toBe('fieldvalue')
    expect(mockIORedisInstance.hget).toHaveBeenCalledWith('hash', 'field')
  })

  it('should set a hash field', async () => {
    mockIORedisInstance.hset.mockResolvedValueOnce(1)
    expect(await client.hset('hash', 'field', 'value')).toBe(1)
    expect(mockIORedisInstance.hset).toHaveBeenCalledWith('hash', 'field', 'value')
  })

  it('should set multiple hash fields', async () => {
    mockIORedisInstance.hset.mockResolvedValueOnce(2)
    expect(await client.hset('hash', { field1: 'value1', field2: 'value2' })).toBe(2)
  })

  it('should delete hash fields', async () => {
    mockIORedisInstance.hdel.mockResolvedValueOnce(1)
    expect(await client.hdel('hash', 'field1', 'field2')).toBe(1)
    expect(mockIORedisInstance.hdel).toHaveBeenCalledWith('hash', 'field1', 'field2')
  })

  it('should check if field exists in hash', async () => {
    mockIORedisInstance.hexists.mockResolvedValueOnce(1)
    expect(await client.hexists('hash', 'field')).toBe(1)
    expect(mockIORedisInstance.hexists).toHaveBeenCalledWith('hash', 'field')
  })

  it('should get all hash fields and values', async () => {
    mockIORedisInstance.hgetall.mockResolvedValueOnce({ f1: 'v1', f2: 'v2' })
    expect(await client.hgetall('hash')).toEqual({ f1: 'v1', f2: 'v2' })
    expect(mockIORedisInstance.hgetall).toHaveBeenCalledWith('hash')
  })

  it('should increment hash field', async () => {
    mockIORedisInstance.hincrby.mockResolvedValueOnce(10)
    expect(await client.hincrby('hash', 'field', 5)).toBe(10)
    expect(mockIORedisInstance.hincrby).toHaveBeenCalledWith('hash', 'field', 5)
  })

  it('should get all hash field names', async () => {
    mockIORedisInstance.hkeys.mockResolvedValueOnce(['f1', 'f2'])
    expect(await client.hkeys('hash')).toEqual(['f1', 'f2'])
    expect(mockIORedisInstance.hkeys).toHaveBeenCalledWith('hash')
  })

  it('should get all hash values', async () => {
    mockIORedisInstance.hvals.mockResolvedValueOnce(['v1', 'v2'])
    expect(await client.hvals('hash')).toEqual(['v1', 'v2'])
    expect(mockIORedisInstance.hvals).toHaveBeenCalledWith('hash')
  })

  it('should get hash length', async () => {
    mockIORedisInstance.hlen.mockResolvedValueOnce(2)
    expect(await client.hlen('hash')).toBe(2)
    expect(mockIORedisInstance.hlen).toHaveBeenCalledWith('hash')
  })

  it('should get multiple hash fields', async () => {
    mockIORedisInstance.hmget.mockResolvedValueOnce(['v1', 'v2'])
    expect(await client.hmget('hash', 'f1', 'f2')).toEqual(['v1', 'v2'])
    expect(mockIORedisInstance.hmget).toHaveBeenCalledWith('hash', 'f1', 'f2')
  })

  it('should set multiple hash fields', async () => {
    mockIORedisInstance.hmset.mockResolvedValueOnce('OK')
    expect(await client.hmset('hash', { f1: 'v1', f2: 'v2' })).toBe('OK')
  })
})
