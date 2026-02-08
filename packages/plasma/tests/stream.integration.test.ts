import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { RedisManager } from '../src/RedisManager'
import { isRedisAvailable } from './helpers'

describe('Stream API', () => {
  let manager: RedisManager
  let available: boolean

  beforeAll(async () => {
    available = await isRedisAvailable()
    if (available) {
      manager = new RedisManager()
      manager.configure({
        connections: {
          default: { host: 'localhost', port: 6379 },
        },
      })
      await manager.connectAll()
    }
  })

  afterAll(async () => {
    if (available) {
      await manager.disconnectAll()
    }
  })

  it('should append to stream (XADD)', async () => {
    if (!available) {
      return
    }
    const redis = manager.getDefault()
    const stream = 'test:stream:add'

    await redis.del(stream)
    const id = await redis.xadd(stream, { name: 'John', age: '30' })

    expect(id).toBeString()
    expect(await redis.xlen(stream)).toBe(1)
  })

  it('should read from stream (XREAD)', async () => {
    if (!available) {
      return
    }
    const redis = manager.getDefault()
    const stream = 'test:stream:read'

    await redis.del(stream)
    const id1 = await redis.xadd(stream, { msg: 'first' })
    const id2 = await redis.xadd(stream, { msg: 'second' })

    // Read from beginning
    const result = await redis.xread({ [stream]: '0' }, { count: 2 })

    expect(result).toBeArray()
    expect(result?.length).toBe(1)
    expect(result?.[0][0]).toBe(stream) // Stream key

    const entries = result?.[0][1]
    expect(entries.length).toBe(2)
    expect(entries[0][0]).toBe(id1)
    expect(entries[1][0]).toBe(id2)
  })

  it('should manage consumer groups (XGROUP/XREADGROUP)', async () => {
    if (!available) {
      return
    }
    const redis = manager.getDefault()
    const stream = 'test:stream:group'
    const group = 'mygroup'

    await redis.del(stream)
    await redis.xadd(stream, { v: '1' })

    // Create group
    const created = await redis.xgroup('CREATE', stream, group, '$', true)
    expect(created).toBe('OK')

    // Add message
    const id = await redis.xadd(stream, { v: '2' })

    // Read group
    const result = await redis.xreadgroup(group, 'alice', { [stream]: '>' })

    expect(result).toBeArray()
    const entries = result?.[0][1]
    expect(entries[0][0]).toBe(id)

    // Ack
    const acked = await redis.xack(stream, group, id)
    expect(acked).toBe(1)
  })

  it('should get range (XRANGE/XREVRANGE)', async () => {
    if (!available) {
      return
    }
    const redis = manager.getDefault()
    const stream = 'test:stream:range'

    await redis.del(stream)
    await redis.xadd(stream, { i: '1' })
    await redis.xadd(stream, { i: '2' })
    await redis.xadd(stream, { i: '3' })

    const range = await redis.xrange(stream, '-', '+')
    expect(range.length).toBe(3)

    const revrange = await redis.xrevrange(stream, '+', '-', 2)
    expect(revrange.length).toBe(2)
    expect(revrange[0][1]).toContain('3') // Latest first
  })
})
