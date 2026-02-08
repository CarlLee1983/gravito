import { beforeEach, describe, expect, it } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Server Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should flush database', async () => {
    mockIORedisInstance.flushdb.mockResolvedValueOnce('OK')
    expect(await client.flushdb()).toBe('OK')
    expect(mockIORedisInstance.flushdb).toHaveBeenCalled()
  })

  it('should flush all databases', async () => {
    mockIORedisInstance.flushall.mockResolvedValueOnce('OK')
    expect(await client.flushall()).toBe('OK')
    expect(mockIORedisInstance.flushall).toHaveBeenCalled()
  })

  it('should get database size', async () => {
    mockIORedisInstance.dbsize.mockResolvedValueOnce(42)
    expect(await client.dbsize()).toBe(42)
    expect(mockIORedisInstance.dbsize).toHaveBeenCalled()
  })

  it('should get server info', async () => {
    mockIORedisInstance.info.mockResolvedValueOnce('# Server\r\nredis_version:7.0.0')
    expect(await client.info()).toBe('# Server\r\nredis_version:7.0.0')
    expect(mockIORedisInstance.info).toHaveBeenCalled()
  })

  it('should get server info for specific section', async () => {
    mockIORedisInstance.info.mockResolvedValueOnce('# Memory\r\nused_memory:1024000')
    expect(await client.info('memory')).toBe('# Memory\r\nused_memory:1024000')
    expect(mockIORedisInstance.info).toHaveBeenCalledWith('memory')
  })
})
