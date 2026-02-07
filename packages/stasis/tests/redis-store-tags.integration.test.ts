import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Redis } from '@gravito/plasma'
import { sleep } from '../src/locks'
import { RedisStore } from '../src/stores/RedisStore'

async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = Redis.connection('tags-test-probe')
    await client.connect()
    await Redis.removeConnection('tags-test-probe')
    return true
  } catch {
    return false
  }
}

describe('RedisStore Tag System', () => {
  let redisAvailable = false

  beforeAll(async () => {
    Redis.configure({
      connections: {
        'tags-test': {
          host: 'localhost',
          port: 6379,
          db: 15,
          maxRetries: 0,
          connectTimeout: 500,
        },
        'tags-test-probe': {
          host: 'localhost',
          port: 6379,
          db: 15,
          maxRetries: 0,
          connectTimeout: 500,
        },
      },
    })

    redisAvailable = await isRedisAvailable()
    if (!redisAvailable) {
      return
    }

    const client = Redis.connection('tags-test')
    await client.connect()
    await client.flushdb()
  })

  afterAll(async () => {
    if (redisAvailable) {
      await Redis.removeConnection('tags-test')
    }
  })

  it('should remove key from tag index when forget is called', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const taggedKey = store.tagKey('user:1', ['users'])
    await store.put(taggedKey, { name: 'Alice' }, 3600)
    await store.tagIndexAdd(['users'], taggedKey)

    const client = Redis.connection('tags-test')
    const tagMembersBefore = await client.smembers('tag:users')
    expect(tagMembersBefore).toContain(taggedKey)

    await store.forget(taggedKey)

    const tagMembersAfter = await client.smembers('tag:users')
    expect(tagMembersAfter).not.toContain(taggedKey)

    const tagMetadata = await client.smembers(`${taggedKey}:tags`)
    expect(tagMetadata).toEqual([])
  })

  it('should atomically delete key and clean up multiple tags', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const taggedKey = store.tagKey('product:1', ['products', 'electronics', 'featured'])
    await store.put(taggedKey, { name: 'Laptop' }, 3600)
    await store.tagIndexAdd(['products', 'electronics', 'featured'], taggedKey)

    const client = Redis.connection('tags-test')
    const tag1Before = await client.smembers('tag:products')
    const tag2Before = await client.smembers('tag:electronics')
    const tag3Before = await client.smembers('tag:featured')
    expect(tag1Before).toContain(taggedKey)
    expect(tag2Before).toContain(taggedKey)
    expect(tag3Before).toContain(taggedKey)

    await store.forget(taggedKey)

    const tag1After = await client.smembers('tag:products')
    const tag2After = await client.smembers('tag:electronics')
    const tag3After = await client.smembers('tag:featured')
    expect(tag1After).not.toContain(taggedKey)
    expect(tag2After).not.toContain(taggedKey)
    expect(tag3After).not.toContain(taggedKey)

    const value = await store.get(taggedKey)
    expect(value).toBeNull()
  })

  it('should record tag metadata when adding to tag index', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const key = 'order:123'
    await store.tagIndexAdd(['orders', 'pending'], key)

    const client = Redis.connection('tags-test')
    const tagMetadata = await client.smembers(`${key}:tags`)
    expect(tagMetadata.sort()).toEqual(['orders', 'pending'])

    const ordersTag = await client.smembers('tag:orders')
    const pendingTag = await client.smembers('tag:pending')
    expect(ordersTag).toContain(key)
    expect(pendingTag).toContain(key)
  })

  it('should clean up tag metadata when tagIndexRemove is called', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const key = 'session:abc'
    await store.tagIndexAdd(['sessions', 'active'], key)

    const client = Redis.connection('tags-test')
    const metadataBefore = await client.smembers(`${key}:tags`)
    expect(metadataBefore.length).toBe(2)

    await store.tagIndexRemove(key)

    const metadataAfter = await client.smembers(`${key}:tags`)
    expect(metadataAfter).toEqual([])

    const sessionsTag = await client.smembers('tag:sessions')
    const activeTag = await client.smembers('tag:active')
    expect(sessionsTag).not.toContain(key)
    expect(activeTag).not.toContain(key)
  })

  it('should handle flushTags correctly without zombie entries', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const key1 = store.tagKey('item:1', ['category:a'])
    const key2 = store.tagKey('item:2', ['category:a'])
    const key3 = store.tagKey('item:3', ['category:a'])

    await store.put(key1, 'value1', 3600)
    await store.put(key2, 'value2', 3600)
    await store.put(key3, 'value3', 3600)

    await store.tagIndexAdd(['category:a'], key1)
    await store.tagIndexAdd(['category:a'], key2)
    await store.tagIndexAdd(['category:a'], key3)

    await store.forget(key2)

    await store.flushTags(['category:a'])

    const client = Redis.connection('tags-test')
    const tagMembers = await client.smembers('tag:category:a')
    expect(tagMembers).toEqual([])

    expect(await store.get(key1)).toBeNull()
    expect(await store.get(key2)).toBeNull()
    expect(await store.get(key3)).toBeNull()
  })

  it('should not leave zombie entries after natural expiration', async () => {
    if (!redisAvailable) {
      return
    }
    const store = new RedisStore({ connection: 'tags-test' })

    const key = store.tagKey('temp:1', ['temporary'])
    await store.put(key, 'expires soon', 1)
    await store.tagIndexAdd(['temporary'], key)

    const client = Redis.connection('tags-test')
    const tagMembersBefore = await client.smembers('tag:temporary')
    expect(tagMembersBefore).toContain(key)

    // Verify value exists and TTL is set
    const valueBeforeExpiry = await store.get(key)
    expect(valueBeforeExpiry).toBe('expires soon')
    const ttlBefore = await client.ttl(key)
    expect(ttlBefore).toBeGreaterThan(0)

    await sleep(1500)

    const expired = await store.get(key)
    expect(expired).toBeNull()
  })
})
