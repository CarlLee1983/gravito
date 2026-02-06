import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Error Handling', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should throw error when not connected', async () => {
    const client2 = new RedisClient({ host: 'localhost' })
    ;(client2 as any).client = null

    let error: unknown
    try {
      await client2.ping()
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
    expect((error as Error).message).toContain('not connected')
  })

  it('should handle health check failure', async () => {
    mockIORedisInstance.ping.mockRejectedValueOnce(new Error('Connection failed'))
    expect(await client.checkHealth()).toBe(false)
  })

  it('should handle connection health check gracefully', async () => {
    ;(client as any).connected = false
    expect(await client.checkHealth()).toBe(false)
  })

  it('should throw error for get when not connected', async () => {
    const client2 = new RedisClient({ host: 'localhost' })
    ;(client2 as any).client = null

    let error: unknown
    try {
      await client2.get('key')
    } catch (e) {
      error = e
    }
    expect(error).toBeDefined()
  })

  it('should handle null values gracefully', async () => {
    mockIORedisInstance.get.mockResolvedValueOnce(null)
    const result = await client.get('nonexistent')
    expect(result).toBeNull()
  })

  it('should handle empty array results', async () => {
    mockIORedisInstance.keys.mockResolvedValueOnce([])
    const result = await client.keys('pattern*')
    expect(result).toEqual([])
  })

  it('should handle mget with mixed values', async () => {
    mockIORedisInstance.mget.mockResolvedValueOnce(['value1', null, 'value3'])
    const result = await client.mget('k1', 'k2', 'k3')
    expect(result).toEqual(['value1', null, 'value3'])
  })

  it('should handle hmget with null values', async () => {
    mockIORedisInstance.hmget.mockResolvedValueOnce([null, 'value'])
    const result = await client.hmget('hash', 'f1', 'f2')
    expect(result).toEqual([null, 'value'])
  })

  it('should handle lrange with empty result', async () => {
    mockIORedisInstance.lrange.mockResolvedValueOnce([])
    const result = await client.lrange('list', 0, 10)
    expect(result).toEqual([])
  })

  it('should handle smembers with empty result', async () => {
    mockIORedisInstance.smembers.mockResolvedValueOnce([])
    const result = await client.smembers('set')
    expect(result).toEqual([])
  })

  it('should handle zrange with empty result', async () => {
    mockIORedisInstance.zrange.mockResolvedValueOnce([])
    const result = await client.zrange('zset', 0, 10)
    expect(result).toEqual([])
  })

  it('should handle null score in zrange with scores', async () => {
    mockIORedisInstance.zrange.mockResolvedValueOnce(['member', null])
    const result = await client.zrange('zset', 0, 0, { withScores: true })
    expect(result).toBeDefined()
  })

  it('should handle hgetall with empty hash', async () => {
    mockIORedisInstance.hgetall.mockResolvedValueOnce({})
    const result = await client.hgetall('hash')
    expect(result).toEqual({})
  })

  it('should handle negative TTL values', async () => {
    mockIORedisInstance.ttl.mockResolvedValueOnce(-1)
    const result = await client.ttl('key')
    expect(result).toBe(-1)
  })

  it('should handle TTL for non-existent key', async () => {
    mockIORedisInstance.ttl.mockResolvedValueOnce(-2)
    const result = await client.ttl('nonexistent')
    expect(result).toBe(-2)
  })

  it('should handle scan cursor progression', async () => {
    mockIORedisInstance.scan.mockResolvedValueOnce(['10', ['k1', 'k2']])
    const result = await client.scan('0')
    expect(result.cursor).toBe('10')
    expect(result.keys).toEqual(['k1', 'k2'])
  })

  it('should handle scan with no results', async () => {
    mockIORedisInstance.scan.mockResolvedValueOnce(['0', []])
    const result = await client.scan('0')
    expect(result.keys).toEqual([])
  })

  it('should handle xread null result', async () => {
    mockIORedisInstance.call.mockResolvedValueOnce(null)
    const result = await client.xread({ stream: '0' })
    expect(result).toBeNull()
  })

  it('should handle subscribe when subscriber already exists', async () => {
    const existingSubscriber = { ...mockIORedisInstance, subscribe: mock(async () => {}) }
    ;(client as any).subscriber = existingSubscriber

    const callback = mock(() => {})
    await client.subscribe('channel', callback)

    // Should use existing subscriber
    expect((client as any).subscriber).toBe(existingSubscriber)
  })

  it('should handle unsubscribe when no subscriber', async () => {
    ;(client as any).subscriber = null
    // Should not throw
    await expect(client.unsubscribe('channel')).resolves.toBeUndefined()
  })
})
