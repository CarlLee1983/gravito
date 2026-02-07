import { beforeEach, describe, expect, it } from 'bun:test'
import { type RedisClient, RedisLock } from '../../src/locks/RedisLock'

class MockRedisClient implements RedisClient {
  private store = new Map<string, { value: string; expiresAt: number }>()

  async set(
    key: string,
    value: string,
    mode: 'EX',
    ttl: number,
    flag: 'NX'
  ): Promise<string | null> {
    const now = Date.now()
    this.cleanupExpired()

    const existing = this.store.get(key)
    if (existing && existing.expiresAt > now) {
      return null
    }

    this.store.set(key, {
      value,
      expiresAt: now + ttl * 1000,
    })

    return 'OK'
  }

  async eval(script: string, numKeys: number, ...args: string[]): Promise<number> {
    this.cleanupExpired()

    const key = args[0]
    const expectedValue = args[1]

    const entry = this.store.get(key)
    if (!entry) {
      return 0
    }

    if (entry.value === expectedValue) {
      this.store.delete(key)
      return 1
    }

    return 0
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key)
      }
    }
  }

  has(key: string): boolean {
    this.cleanupExpired()
    const entry = this.store.get(key)
    if (!entry) return false
    return entry.expiresAt > Date.now()
  }

  clear(): void {
    this.store.clear()
  }
}

describe('RedisLock', () => {
  let mockClient: MockRedisClient
  let lock: RedisLock

  beforeEach(() => {
    mockClient = new MockRedisClient()
    lock = new RedisLock({ client: mockClient })
  })

  describe('acquire', () => {
    it('should acquire lock when resource is not locked', async () => {
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(true)
    })

    it('should not acquire lock when resource is already locked', async () => {
      await lock.acquire('test-resource', 1000)
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(false)
    })

    it('should acquire lock after TTL expires', async () => {
      await lock.acquire('test-resource', 100) // 100ms TTL
      await new Promise((resolve) => setTimeout(resolve, 150)) // Wait 150ms for expiry
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should handle multiple resources independently', async () => {
      const acquired1 = await lock.acquire('resource-1', 1000)
      const acquired2 = await lock.acquire('resource-2', 1000)
      expect(acquired1).toBe(true)
      expect(acquired2).toBe(true)
      expect(mockClient.has('sitemap:lock:resource-1')).toBe(true)
      expect(mockClient.has('sitemap:lock:resource-2')).toBe(true)
    })

    it('should use custom keyPrefix when provided', async () => {
      const customLock = new RedisLock({
        client: mockClient,
        keyPrefix: 'custom:prefix:',
      })

      await customLock.acquire('test-resource', 1000)
      expect(mockClient.has('custom:prefix:test-resource')).toBe(true)
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(false)
    })

    it('should convert TTL from milliseconds to seconds', async () => {
      await lock.acquire('test-resource', 100) // 100ms TTL
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150)) // Wait for expiry
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(false)
    })
  })

  describe('release', () => {
    it('should release lock and allow reacquisition', async () => {
      await lock.acquire('test-resource', 1000)
      await lock.release('test-resource')
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(false)

      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should be safe to release non-existent lock', async () => {
      await expect(lock.release('non-existent')).resolves.toBeUndefined()
    })

    it('should only release lock owned by this instance', async () => {
      const lock1 = new RedisLock({ client: mockClient })
      const lock2 = new RedisLock({ client: mockClient })

      await lock1.acquire('test-resource', 1000)

      await lock2.release('test-resource')

      expect(mockClient.has('sitemap:lock:test-resource')).toBe(true)

      await lock1.release('test-resource')
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(false)
    })
  })

  describe('retry mechanism', () => {
    it('should retry acquisition when retryCount is set', async () => {
      const lockWithRetry = new RedisLock({
        client: mockClient,
        retryCount: 3,
        retryDelay: 10,
      })

      await lock.acquire('test-resource', 100)

      const acquired = await lockWithRetry.acquire('test-resource', 1000)
      expect(acquired).toBe(false)
    })

    it('should eventually acquire lock after retry when TTL expires', async () => {
      const lockWithRetry = new RedisLock({
        client: mockClient,
        retryCount: 15,
        retryDelay: 100,
      })

      await lock.acquire('test-resource', 1000)

      const acquired = await lockWithRetry.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should respect retryCount limit', async () => {
      const lockWithRetry = new RedisLock({
        client: mockClient,
        retryCount: 2,
        retryDelay: 10,
      })

      await lock.acquire('test-resource', 5000)

      const startTime = Date.now()
      const acquired = await lockWithRetry.acquire('test-resource', 1000)
      const elapsed = Date.now() - startTime

      expect(acquired).toBe(false)
      expect(elapsed).toBeGreaterThanOrEqual(20)
      expect(elapsed).toBeLessThan(250)
    })
  })

  describe('concurrent access', () => {
    it('should prevent concurrent access to same resource', async () => {
      const results = await Promise.all([
        lock.acquire('test-resource', 1000),
        lock.acquire('test-resource', 1000),
        lock.acquire('test-resource', 1000),
      ])

      const acquiredCount = results.filter((r) => r === true).length
      expect(acquiredCount).toBe(1)
    })

    it('should handle multiple instances competing for lock', async () => {
      const lock1 = new RedisLock({ client: mockClient })
      const lock2 = new RedisLock({ client: mockClient })
      const lock3 = new RedisLock({ client: mockClient })

      const results = await Promise.all([
        lock1.acquire('test-resource', 1000),
        lock2.acquire('test-resource', 1000),
        lock3.acquire('test-resource', 1000),
      ])

      const acquiredCount = results.filter((r) => r === true).length
      expect(acquiredCount).toBe(1)
    })
  })

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully on acquire', async () => {
      const failingClient: RedisClient = {
        async set() {
          throw new Error('Redis connection failed')
        },
        async eval() {
          throw new Error('Redis connection failed')
        },
      }

      const lockWithFailingClient = new RedisLock({ client: failingClient })

      const acquired = await lockWithFailingClient.acquire('test-resource', 1000)
      expect(acquired).toBe(false)
    })

    it('should handle Redis connection errors gracefully on release', async () => {
      const failingClient: RedisClient = {
        async set() {
          return 'OK'
        },
        async eval() {
          throw new Error('Redis connection failed')
        },
      }

      const lockWithFailingClient = new RedisLock({ client: failingClient })

      await expect(lockWithFailingClient.release('test-resource')).resolves.toBeUndefined()
    })
  })

  describe('ownership validation', () => {
    it('should prevent instance A from releasing instance B lock after expiry', async () => {
      const lockA = new RedisLock({ client: mockClient })
      const lockB = new RedisLock({ client: mockClient })

      const acquiredA = await lockA.acquire('test-resource', 1000)
      expect(acquiredA).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 1100))

      const acquiredB = await lockB.acquire('test-resource', 1000)
      expect(acquiredB).toBe(true)
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(true)

      await lockA.release('test-resource')

      expect(mockClient.has('sitemap:lock:test-resource')).toBe(true)

      await lockB.release('test-resource')
      expect(mockClient.has('sitemap:lock:test-resource')).toBe(false)
    })
  })
})
