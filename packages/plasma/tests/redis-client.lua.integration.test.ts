import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Lua Scripts', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should execute lua script', async () => {
    mockIORedisInstance.eval.mockResolvedValueOnce('result')
    expect(await client.eval('return 1', 0)).toBe('result')
    expect(mockIORedisInstance.eval).toHaveBeenCalledWith('return 1', 0)
  })

  it('should execute lua script with keys and args', async () => {
    mockIORedisInstance.eval.mockResolvedValueOnce('value')
    await client.eval('return redis.call("GET", KEYS[1])', 1, 'mykey')
    expect(mockIORedisInstance.eval).toHaveBeenCalled()
  })

  it('should execute lua script by SHA1', async () => {
    mockIORedisInstance.evalsha.mockResolvedValueOnce('result')
    expect(await client.evalsha('abc123', 0)).toBe('result')
    expect(mockIORedisInstance.evalsha).toHaveBeenCalledWith('abc123', 0)
  })

  it('should execute lua script by SHA1 with keys and args', async () => {
    mockIORedisInstance.evalsha.mockResolvedValueOnce('value')
    await client.evalsha('abc123', 1, 'key1', 'arg1')
    expect(mockIORedisInstance.evalsha).toHaveBeenCalled()
  })
})
