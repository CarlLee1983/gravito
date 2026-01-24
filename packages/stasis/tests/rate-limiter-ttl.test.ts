import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Redis } from '@gravito/plasma'
import { RateLimiter } from '../src/RateLimiter'
import { FileStore } from '../src/stores/FileStore'
import { MemoryStore } from '../src/stores/MemoryStore'
import { RedisStore } from '../src/stores/RedisStore'

describe('RateLimiter TTL Precision', () => {
  describe('MemoryStore', () => {
    let store: MemoryStore
    let limiter: RateLimiter

    beforeEach(() => {
      store = new MemoryStore()
      limiter = new RateLimiter(store)
    })

    it('returns accurate retryAfter when limit exceeded', async () => {
      await limiter.attempt('test:1', 2, 10)
      await limiter.attempt('test:1', 2, 10)

      const blocked = await limiter.attempt('test:1', 2, 10)

      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()
      expect(blocked.retryAfter).toBeGreaterThan(0)
      expect(blocked.retryAfter).toBeLessThanOrEqual(10)
    })

    it('availableIn returns accurate TTL', async () => {
      await store.put('test:2', 5, 10)

      const ttl = await limiter.availableIn('test:2', 10)

      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(10)
    })

    it('availableIn falls back to decaySeconds when TTL not available', async () => {
      const ttl = await limiter.availableIn('nonexistent', 30)
      expect(ttl).toBe(30)
    })

    it('getInfo returns complete status for new key', async () => {
      const info = await limiter.getInfo('test:3', 5, 60)

      expect(info.limit).toBe(5)
      expect(info.remaining).toBe(5)
      expect(info.reset).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(info.retryAfter).toBeUndefined()
    })

    it('getInfo returns complete status for active key', async () => {
      await limiter.attempt('test:4', 5, 60)
      await limiter.attempt('test:4', 5, 60)

      const info = await limiter.getInfo('test:4', 5, 60)

      expect(info.limit).toBe(5)
      expect(info.remaining).toBe(3)
      expect(info.reset).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(info.retryAfter).toBeUndefined()
    })

    it('getInfo returns retryAfter when limit exceeded', async () => {
      await store.put('test:5', 10, 60)

      const info = await limiter.getInfo('test:5', 5, 60)

      expect(info.limit).toBe(5)
      expect(info.remaining).toBe(0)
      expect(info.retryAfter).toBeDefined()
      expect(info.retryAfter).toBeGreaterThan(0)
      expect(info.retryAfter).toBeLessThanOrEqual(60)
    })

    it('TTL decreases over time', async () => {
      await store.put('test:6', 3, 3)

      const ttl1 = await limiter.availableIn('test:6', 3)
      await Bun.sleep(1100)
      const ttl2 = await limiter.availableIn('test:6', 3)

      expect(ttl1).toBeGreaterThan(0)
      expect(ttl2).toBeLessThan(ttl1)
    })
  })

  describe('FileStore', () => {
    let store: FileStore
    let limiter: RateLimiter

    beforeEach(() => {
      store = new FileStore({ directory: './tmp/test-rate-limiter-ttl' })
      limiter = new RateLimiter(store)
    })

    it('returns accurate retryAfter when limit exceeded', async () => {
      await limiter.attempt('test:1', 2, 10)
      await limiter.attempt('test:1', 2, 10)

      const blocked = await limiter.attempt('test:1', 2, 10)

      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()
      expect(blocked.retryAfter).toBeGreaterThan(0)
      expect(blocked.retryAfter).toBeLessThanOrEqual(10)
    })

    it('getInfo returns accurate TTL information', async () => {
      await store.put('test:2', 5, 60)

      const info = await limiter.getInfo('test:2', 3, 60)

      expect(info.limit).toBe(3)
      expect(info.remaining).toBe(0)
      expect(info.retryAfter).toBeDefined()
      expect(info.retryAfter).toBeGreaterThan(0)
      expect(info.retryAfter).toBeLessThanOrEqual(60)
    })
  })

  describe('RedisStore', () => {
    let store: RedisStore
    let limiter: RateLimiter

    beforeAll(async () => {
      Redis.configure({
        connections: {
          'ratelimit-test': {
            host: 'localhost',
            port: 6379,
            db: 15,
          },
        },
      })
      const client = Redis.connection('ratelimit-test')
      await client.connect()
    })

    afterAll(async () => {
      await Redis.removeConnection('ratelimit-test')
    })

    beforeEach(async () => {
      const client = Redis.connection('ratelimit-test')
      await client.flushdb()
      store = new RedisStore({ connection: 'ratelimit-test', prefix: 'ttl:' })
      limiter = new RateLimiter(store)
    })

    it('returns accurate retryAfter when limit exceeded', async () => {
      await limiter.attempt('test:1', 2, 10)
      await limiter.attempt('test:1', 2, 10)

      const blocked = await limiter.attempt('test:1', 2, 10)

      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()
      expect(blocked.retryAfter).toBeGreaterThan(0)
      expect(blocked.retryAfter).toBeLessThanOrEqual(10)
    })

    it('availableIn returns accurate TTL from Redis', async () => {
      await store.put('test:2', 5, 10)

      const ttl = await limiter.availableIn('test:2', 10)

      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(10)
    })

    it('getInfo returns complete status with Redis TTL', async () => {
      await store.put('test:3', 10, 60)

      const info = await limiter.getInfo('test:3', 5, 60)

      expect(info.limit).toBe(5)
      expect(info.remaining).toBe(0)
      expect(info.retryAfter).toBeDefined()
      expect(info.retryAfter).toBeGreaterThan(0)
      expect(info.retryAfter).toBeLessThanOrEqual(60)
    })

    it('TTL precision is accurate within 1 second', async () => {
      await store.put('test:4', 3, 30)

      const ttl1 = await limiter.availableIn('test:4', 30)
      await Bun.sleep(2000)
      const ttl2 = await limiter.availableIn('test:4', 30)

      expect(ttl1 - ttl2).toBeGreaterThanOrEqual(1)
      expect(ttl1 - ttl2).toBeLessThanOrEqual(3)
    })
  })

  describe('Cross-store TTL consistency', () => {
    it('all stores provide consistent retryAfter behavior', async () => {
      const stores = [new MemoryStore(), new FileStore({ directory: './tmp/test-ttl-consistency' })]

      for (const store of stores) {
        const limiter = new RateLimiter(store)

        await limiter.attempt('key', 1, 10)
        const blocked = await limiter.attempt('key', 1, 10)

        expect(blocked.allowed).toBe(false)
        expect(blocked.retryAfter).toBeDefined()
        expect(blocked.retryAfter).toBeGreaterThan(0)
        expect(blocked.retryAfter).toBeLessThanOrEqual(10)

        await store.flush()
      }
    })
  })
})
