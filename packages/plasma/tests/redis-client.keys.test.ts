import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Key Operations', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should find keys by pattern', async () => {
    mockIORedisInstance.keys.mockResolvedValueOnce(['k1', 'k2', 'k3'])
    expect(await client.keys('k*')).toEqual(['k1', 'k2', 'k3'])
    expect(mockIORedisInstance.keys).toHaveBeenCalledWith('k*')
  })

  it('should scan keys', async () => {
    mockIORedisInstance.scan.mockResolvedValueOnce(['0', ['k1', 'k2']])
    const result = await client.scan('0')
    expect(result).toEqual({ cursor: '0', keys: ['k1', 'k2'] })
  })

  it('should scan with MATCH option', async () => {
    mockIORedisInstance.scan.mockResolvedValueOnce([10, ['k1']])
    await client.scan('0', { match: 'k*' })
    expect(mockIORedisInstance.scan).toHaveBeenCalled()
  })

  it('should scan with COUNT option', async () => {
    mockIORedisInstance.scan.mockResolvedValueOnce([10, ['k1']])
    await client.scan('0', { count: 100 })
    expect(mockIORedisInstance.scan).toHaveBeenCalled()
  })

  it('should get type of key', async () => {
    mockIORedisInstance.type.mockResolvedValueOnce('string')
    expect(await client.type('key')).toBe('string')
    expect(mockIORedisInstance.type).toHaveBeenCalledWith('key')
  })

  it('should rename key', async () => {
    mockIORedisInstance.rename.mockResolvedValueOnce('OK')
    expect(await client.rename('oldkey', 'newkey')).toBe('OK')
    expect(mockIORedisInstance.rename).toHaveBeenCalledWith('oldkey', 'newkey')
  })

  it('should rename key conditionally', async () => {
    mockIORedisInstance.renamenx.mockResolvedValueOnce(1)
    expect(await client.renamenx('oldkey', 'newkey')).toBe(1)
    expect(mockIORedisInstance.renamenx).toHaveBeenCalledWith('oldkey', 'newkey')
  })
})
