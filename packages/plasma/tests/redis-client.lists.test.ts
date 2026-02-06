import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - List Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should push to the beginning of list', async () => {
    mockIORedisInstance.lpush.mockResolvedValueOnce(1)
    expect(await client.lpush('list', 'v1')).toBe(1)
    expect(mockIORedisInstance.lpush).toHaveBeenCalledWith('list', 'v1')
  })

  it('should push multiple values to list', async () => {
    mockIORedisInstance.lpush.mockResolvedValueOnce(3)
    expect(await client.lpush('list', 'v1', 'v2', 'v3')).toBe(3)
  })

  it('should push to the end of list', async () => {
    mockIORedisInstance.rpush.mockResolvedValueOnce(1)
    expect(await client.rpush('list', 'v1')).toBe(1)
    expect(mockIORedisInstance.rpush).toHaveBeenCalledWith('list', 'v1')
  })

  it('should pop from the beginning of list', async () => {
    mockIORedisInstance.lpop.mockResolvedValueOnce('v1')
    expect(await client.lpop('list')).toBe('v1')
    expect(mockIORedisInstance.lpop).toHaveBeenCalledWith('list')
  })

  it('should pop from the end of list', async () => {
    mockIORedisInstance.rpop.mockResolvedValueOnce('v1')
    expect(await client.rpop('list')).toBe('v1')
    expect(mockIORedisInstance.rpop).toHaveBeenCalledWith('list')
  })

  it('should get range of list values', async () => {
    mockIORedisInstance.lrange.mockResolvedValueOnce(['v1', 'v2', 'v3'])
    expect(await client.lrange('list', 0, 2)).toEqual(['v1', 'v2', 'v3'])
    expect(mockIORedisInstance.lrange).toHaveBeenCalledWith('list', 0, 2)
  })

  it('should get list length', async () => {
    mockIORedisInstance.llen.mockResolvedValueOnce(3)
    expect(await client.llen('list')).toBe(3)
    expect(mockIORedisInstance.llen).toHaveBeenCalledWith('list')
  })

  it('should get element at index', async () => {
    mockIORedisInstance.lindex.mockResolvedValueOnce('v2')
    expect(await client.lindex('list', 1)).toBe('v2')
    expect(mockIORedisInstance.lindex).toHaveBeenCalledWith('list', 1)
  })

  it('should set element at index', async () => {
    mockIORedisInstance.lset.mockResolvedValueOnce('OK')
    expect(await client.lset('list', 1, 'newvalue')).toBe('OK')
    expect(mockIORedisInstance.lset).toHaveBeenCalledWith('list', 1, 'newvalue')
  })

  it('should remove elements from list', async () => {
    mockIORedisInstance.lrem.mockResolvedValueOnce(2)
    expect(await client.lrem('list', 0, 'value')).toBe(2)
    expect(mockIORedisInstance.lrem).toHaveBeenCalledWith('list', 0, 'value')
  })

  it('should trim list', async () => {
    mockIORedisInstance.ltrim.mockResolvedValueOnce('OK')
    expect(await client.ltrim('list', 0, 10)).toBe('OK')
    expect(mockIORedisInstance.ltrim).toHaveBeenCalledWith('list', 0, 10)
  })
})
