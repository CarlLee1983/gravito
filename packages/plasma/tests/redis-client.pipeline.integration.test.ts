import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'
import {
  createMockIORedisInstance,
  MockIORedis,
  setupRedisClientMock,
} from './helpers/redis-client.test-helpers'

describe('RedisClient (ioredis wrapper) - Pipeline', () => {
  let client: RedisClient
  let mockIORedisInstance: any

  beforeEach(() => {
    mockIORedisInstance = createMockIORedisInstance()
    client = new RedisClient({ host: 'localhost' })
    setupRedisClientMock(client, mockIORedisInstance)
  })

  it('should execute pipeline with get', async () => {
    const pipeline = client.pipeline()
    pipeline.get('k1')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with set', async () => {
    const pipeline = client.pipeline()
    pipeline.set('k1', 'v1')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with del', async () => {
    const pipeline = client.pipeline()
    pipeline.del('k1', 'k2')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with hset', async () => {
    const pipeline = client.pipeline()
    pipeline.hset('h1', 'f1', 'v1')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with lpush', async () => {
    const pipeline = client.pipeline()
    pipeline.lpush('list', 'v1')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with sadd', async () => {
    const pipeline = client.pipeline()
    pipeline.sadd('set', 'm1')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with incr', async () => {
    const pipeline = client.pipeline()
    pipeline.incr('counter')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with decr', async () => {
    const pipeline = client.pipeline()
    pipeline.decr('counter')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with srem and smembers', async () => {
    const pipeline = client.pipeline()
    pipeline.srem('set', 'm1').smembers('set')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should execute pipeline with multiple mixed commands', async () => {
    const pipeline = client.pipeline()
    pipeline
      .get('k1')
      .set('k2', 'v2')
      .del('k3')
      .hset('h1', 'f1', 'v1')
      .lpush('list', 'v1')
      .sadd('set', 'm1')
      .scard('set')
    const result = await pipeline.exec()
    expect(result).toBeDefined()
  })

  it('should handle empty pipeline', async () => {
    const result = await client.pipeline().exec()
    expect(result).toBeDefined()
  })

  it('should chain pipeline methods', async () => {
    const p = client.pipeline()
    const chainResult = p.get('k1').set('k2', 'v2').del('k3')
    expect(chainResult).toBe(p)
  })
})
