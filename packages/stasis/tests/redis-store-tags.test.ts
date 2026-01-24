import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Redis } from '@gravito/plasma'
import { sleep } from '../src/locks'
import { RedisStore } from '../src/stores/RedisStore'

describe('RedisStore Tag System', () => {
  beforeAll(async () => {
    Redis.configure({
      default: 'test',
      connections: {
        test: {
          host: 'localhost',
          port: 6379,
          db: 15,
        },
      },
    })
    await Redis.connect()
    await Redis.flushdb()
  })

  afterAll(async () => {
    await Redis.flushdb()
    await Redis.disconnect()
  })

  it('should remove key from tag index when forget is called', async () => {
    const store = new RedisStore({ connection: 'test' })

    const taggedKey = store.tagKey('user:1', ['users'])
    await store.put(taggedKey, { name: 'Alice' }, 3600)
    await store.tagIndexAdd(['users'], taggedKey)

    const tagMembersBefore = await Redis.smembers('tag:users')
    expect(tagMembersBefore).toContain(taggedKey)

    await store.forget(taggedKey)

    const tagMembersAfter = await Redis.smembers('tag:users')
    expect(tagMembersAfter).not.toContain(taggedKey)

    const tagMetadata = await Redis.smembers(`${taggedKey}:tags`)
    expect(tagMetadata).toEqual([])
  })

  it('should atomically delete key and clean up multiple tags', async () => {
    const store = new RedisStore({ connection: 'test' })

    const taggedKey = store.tagKey('product:1', ['products', 'electronics', 'featured'])
    await store.put(taggedKey, { name: 'Laptop' }, 3600)
    await store.tagIndexAdd(['products', 'electronics', 'featured'], taggedKey)

    const tag1Before = await Redis.smembers('tag:products')
    const tag2Before = await Redis.smembers('tag:electronics')
    const tag3Before = await Redis.smembers('tag:featured')
    expect(tag1Before).toContain(taggedKey)
    expect(tag2Before).toContain(taggedKey)
    expect(tag3Before).toContain(taggedKey)

    await store.forget(taggedKey)

    const tag1After = await Redis.smembers('tag:products')
    const tag2After = await Redis.smembers('tag:electronics')
    const tag3After = await Redis.smembers('tag:featured')
    expect(tag1After).not.toContain(taggedKey)
    expect(tag2After).not.toContain(taggedKey)
    expect(tag3After).not.toContain(taggedKey)

    const value = await store.get(taggedKey)
    expect(value).toBeNull()
  })

  it('should record tag metadata when adding to tag index', async () => {
    const store = new RedisStore({ connection: 'test' })

    const key = 'order:123'
    await store.tagIndexAdd(['orders', 'pending'], key)

    const tagMetadata = await Redis.smembers(`${key}:tags`)
    expect(tagMetadata.sort()).toEqual(['orders', 'pending'])

    const ordersTag = await Redis.smembers('tag:orders')
    const pendingTag = await Redis.smembers('tag:pending')
    expect(ordersTag).toContain(key)
    expect(pendingTag).toContain(key)
  })

  it('should clean up tag metadata when tagIndexRemove is called', async () => {
    const store = new RedisStore({ connection: 'test' })

    const key = 'session:abc'
    await store.tagIndexAdd(['sessions', 'active'], key)

    const metadataBefore = await Redis.smembers(`${key}:tags`)
    expect(metadataBefore.length).toBe(2)

    await store.tagIndexRemove(key)

    const metadataAfter = await Redis.smembers(`${key}:tags`)
    expect(metadataAfter).toEqual([])

    const sessionsTag = await Redis.smembers('tag:sessions')
    const activeTag = await Redis.smembers('tag:active')
    expect(sessionsTag).not.toContain(key)
    expect(activeTag).not.toContain(key)
  })

  it('should handle flushTags correctly without zombie entries', async () => {
    const store = new RedisStore({ connection: 'test' })

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

    const tagMembers = await Redis.smembers('tag:category:a')
    expect(tagMembers).toEqual([])

    expect(await store.get(key1)).toBeNull()
    expect(await store.get(key2)).toBeNull()
    expect(await store.get(key3)).toBeNull()
  })

  it('should not leave zombie entries after natural expiration', async () => {
    const store = new RedisStore({ connection: 'test' })

    const key = store.tagKey('temp:1', ['temporary'])
    await store.put(key, 'expires soon', 0.1)
    await store.tagIndexAdd(['temporary'], key)

    const tagMembersBefore = await Redis.smembers('tag:temporary')
    expect(tagMembersBefore).toContain(key)

    await sleep(150)

    const expired = await store.get(key)
    expect(expired).toBeNull()
  })
})
