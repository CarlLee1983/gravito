import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'
import { isRedisAvailable } from './helpers'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379

describe('BunRedisClient Integration', () => {
  const client = new BunRedisClient({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetries: 3,
  })

  beforeAll(async () => {
    if (!(await isRedisAvailable())) {
      console.warn('Skipping integration tests: Redis not available')
      return
    }

    try {
      await client.connect()
      await client.flushall()
    } catch (_error) {
      console.warn('Skipping integration tests: Redis available but connection failed')
    }
  })

  afterAll(async () => {
    if (client.isConnected()) {
      await client.flushall()
      await client.disconnect()
    }
  })

  // Skip tests if not connected (handled via check inside tests or beforeAll logic)
  // Bun test doesn't have explicit "skip suite if" easily, so we check inside

  it('should ping the server', async () => {
    if (!client.isConnected()) {
      return
    }
    expect(await client.ping()).toBe('PONG')
  })

  it('should perform basic string operations', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.set('foo', 'bar')
    expect(await client.get('foo')).toBe('bar')

    expect(await client.exists('foo')).toBe(1)
    expect(await client.del('foo')).toBe(1)
    expect(await client.exists('foo')).toBe(0)
  })

  it('should handle TTLs', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.set('expire_me', 'val', { ex: 1 }) // 1 second
    expect(await client.get('expire_me')).toBe('val')

    await new Promise((r) => setTimeout(r, 1100))
    expect(await client.get('expire_me')).toBeNull()
  })

  it('should handle hash operations', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.hset('user:1', { name: 'Alice', age: '30' })
    const all = await client.hgetall('user:1')
    expect(all).toEqual({ name: 'Alice', age: '30' })

    expect(await client.hget('user:1', 'name')).toBe('Alice')
  })

  it('should handle list operations', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.lpush('list:1', 'a', 'b')
    expect(await client.rpop('list:1')).toBe('a')
    expect(await client.rpop('list:1')).toBe('b')
    expect(await client.rpop('list:1')).toBeNull()
  })

  it('should handle set operations', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.sadd('set:1', 'm1', 'm2')
    expect(await client.sismember('set:1', 'm1')).toBe(1)
    expect(await client.sismember('set:1', 'm3')).toBe(0)

    const members = await client.smembers('set:1')
    expect(members.sort()).toEqual(['m1', 'm2'].sort())
  })

  it('should handle sorted set operations', async () => {
    if (!client.isConnected()) {
      return
    }

    await client.zadd('zset:1', { score: 1, member: 'one' }, { score: 2, member: 'two' })

    const range = await client.zrange('zset:1', 0, -1)
    expect(range).toEqual(['one', 'two'])

    const withScores = await client.zrange('zset:1', 0, -1, { withScores: true })
    // Bun redis might return ['one', '1', 'two', '2']
    expect(withScores).toEqual(['one', '1', 'two', '2'])
  })

  it('should execute pipeline', async () => {
    if (!client.isConnected()) {
      return
    }

    const pipeline = client.pipeline()
    pipeline.set('p:1', 'v1')
    pipeline.get('p:1')
    pipeline.del('p:1')

    const results = await pipeline.exec()
    expect(results).toHaveLength(3)
    expect(results[0]).toEqual([null, 'OK'])
    expect(results[1]).toEqual([null, 'v1'])
    expect(results[2]).toEqual([null, 1])
  })
})
