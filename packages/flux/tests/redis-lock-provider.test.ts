import { beforeEach, describe, expect, it } from 'bun:test'
import type { RedisClient } from '../src/core/RedisLockProvider'
import { RedisLockProvider } from '../src/core/RedisLockProvider'

function createMockRedisClient(): RedisClient & {
  storage: Map<string, { value: string; expiresAt: number }>
} {
  const storage = new Map<string, { value: string; expiresAt: number }>()

  return {
    storage,

    async set(
      key: string,
      value: string,
      options?: { NX?: boolean; PX?: number }
    ): Promise<'OK' | null> {
      const now = Date.now()
      const existing = storage.get(key)

      if (options?.NX && existing && existing.expiresAt > now) {
        return null
      }

      const expiresAt = options?.PX ? now + options.PX : now + 30000
      storage.set(key, { value, expiresAt })
      return 'OK'
    },

    async get(key: string): Promise<string | null> {
      const now = Date.now()
      const entry = storage.get(key)

      if (!entry || entry.expiresAt <= now) {
        storage.delete(key)
        return null
      }

      return entry.value
    },

    async del(key: string): Promise<number> {
      const existed = storage.has(key)
      storage.delete(key)
      return existed ? 1 : 0
    },

    async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
      const key = keys[0]
      const entry = storage.get(key)
      const now = Date.now()

      if (script.includes('pexpire')) {
        if (entry && entry.value === args[0] && entry.expiresAt > now) {
          entry.expiresAt = now + Number(args[1])
          return 1
        }
        return 0
      }

      if (script.includes('del')) {
        if (entry && entry.value === args[0]) {
          storage.delete(key)
          return 1
        }
        return 0
      }

      return 0
    },
  }
}

describe('RedisLockProvider', () => {
  let client: ReturnType<typeof createMockRedisClient>
  let provider: RedisLockProvider

  beforeEach(() => {
    client = createMockRedisClient()
    provider = new RedisLockProvider({
      client,
      keyPrefix: 'test:lock:',
      defaultTtl: 5000,
    })
  })

  describe('acquire', () => {
    it('should acquire a lock successfully', async () => {
      const lock = await provider.acquire('resource-1', 'owner-1', 5000)

      expect(lock).not.toBeNull()
      expect(lock?.id).toBe('resource-1')
      expect(lock?.owner).toBe('owner-1')
      expect(lock?.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should store lock with correct key prefix', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      expect(client.storage.has('test:lock:resource-1')).toBe(true)
    })

    it('should fail to acquire lock held by another owner', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)
      const lock = await provider.acquire('resource-1', 'owner-2', 5000)

      expect(lock).toBeNull()
    })

    it('should allow same owner to reacquire (refresh) lock', async () => {
      const lock1 = await provider.acquire('resource-1', 'owner-1', 5000)
      const lock2 = await provider.acquire('resource-1', 'owner-1', 5000)

      expect(lock1).not.toBeNull()
      expect(lock2).not.toBeNull()
      expect(lock2?.owner).toBe('owner-1')
    })

    it('should use default TTL when ttl is 0', async () => {
      const lock = await provider.acquire('resource-1', 'owner-1', 0)

      expect(lock).not.toBeNull()
      expect(lock?.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should retry on failure with retries configured', async () => {
      const retryProvider = new RedisLockProvider({
        client,
        keyPrefix: 'test:lock:',
        maxRetries: 2,
        retryDelay: 10,
      })

      await retryProvider.acquire('resource-1', 'owner-1', 5000)

      const startTime = Date.now()
      const lock = await retryProvider.acquire('resource-1', 'owner-2', 5000)
      const elapsed = Date.now() - startTime

      expect(lock).toBeNull()
      expect(elapsed).toBeGreaterThanOrEqual(20)
    })
  })

  describe('refresh', () => {
    it('should refresh lock owned by same owner', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      const refreshed = await provider.refresh('resource-1', 'owner-1', 10000)

      expect(refreshed).toBe(true)
    })

    it('should fail to refresh lock owned by different owner', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      const refreshed = await provider.refresh('resource-1', 'owner-2', 10000)

      expect(refreshed).toBe(false)
    })

    it('should fail to refresh non-existent lock', async () => {
      const refreshed = await provider.refresh('resource-1', 'owner-1', 10000)

      expect(refreshed).toBe(false)
    })

    it('should use default TTL when ttl is 0', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      const refreshed = await provider.refresh('resource-1', 'owner-1', 0)

      expect(refreshed).toBe(true)
    })
  })

  describe('release', () => {
    it('should forcefully release any lock', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      await provider.release('resource-1')

      expect(client.storage.has('test:lock:resource-1')).toBe(false)
    })

    it('should not throw when releasing non-existent lock', async () => {
      await expect(provider.release('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('releaseIfOwned', () => {
    it('should release lock if owned', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      const released = await provider.releaseIfOwned('resource-1', 'owner-1')

      expect(released).toBe(true)
      expect(client.storage.has('test:lock:resource-1')).toBe(false)
    })

    it('should not release lock if not owned', async () => {
      await provider.acquire('resource-1', 'owner-1', 5000)

      const released = await provider.releaseIfOwned('resource-1', 'owner-2')

      expect(released).toBe(false)
      expect(client.storage.has('test:lock:resource-1')).toBe(true)
    })

    it('should return false for non-existent lock', async () => {
      const released = await provider.releaseIfOwned('non-existent', 'owner-1')

      expect(released).toBe(false)
    })
  })

  describe('Lock object', () => {
    it('should have release method that calls releaseIfOwned', async () => {
      const lock = await provider.acquire('resource-1', 'owner-1', 5000)

      expect(lock).not.toBeNull()
      expect(typeof lock?.release).toBe('function')

      await lock?.release()

      expect(client.storage.has('test:lock:resource-1')).toBe(false)
    })

    it('should only release if still owned', async () => {
      const lock1 = await provider.acquire('resource-1', 'owner-1', 5000)

      await provider.release('resource-1')
      await provider.acquire('resource-1', 'owner-2', 5000)

      await lock1?.release()

      expect(client.storage.has('test:lock:resource-1')).toBe(true)
      const entry = client.storage.get('test:lock:resource-1')
      expect(entry?.value).toBe('owner-2')
    })
  })

  describe('default options', () => {
    it('should use default keyPrefix', async () => {
      const defaultProvider = new RedisLockProvider({ client })
      await defaultProvider.acquire('resource-1', 'owner-1', 5000)

      expect(client.storage.has('flux:lock:resource-1')).toBe(true)
    })

    it('should use default TTL of 30000ms', async () => {
      const defaultProvider = new RedisLockProvider({ client })
      const lock = await defaultProvider.acquire('resource-1', 'owner-1', 0)

      expect(lock).not.toBeNull()
      const expectedMinExpiry = Date.now() + 29000
      expect(lock?.expiresAt).toBeGreaterThan(expectedMinExpiry)
    })
  })

  describe('expiration', () => {
    it('should allow acquiring expired lock', async () => {
      client.storage.set('test:lock:resource-1', {
        value: 'owner-1',
        expiresAt: Date.now() - 1000,
      })

      const lock = await provider.acquire('resource-1', 'owner-2', 5000)

      expect(lock).not.toBeNull()
      expect(lock?.owner).toBe('owner-2')
    })
  })
})
