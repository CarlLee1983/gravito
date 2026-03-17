import { beforeEach, describe, expect, it } from 'bun:test'
import {
  MemoryRateLimiterStorage,
  type RateLimitConfig,
  RateLimiter,
} from '../../../src/services/RateLimiter'

describe('MemoryRateLimiterStorage', () => {
  let storage: MemoryRateLimiterStorage

  beforeEach(() => {
    storage = new MemoryRateLimiterStorage()
  })

  it('returns null for non-existent keys', async () => {
    const result = await storage.get('nonexistent')
    expect(result).toBeNull()
  })

  it('stores and retrieves entries', async () => {
    const entry = {
      attempts: 3,
      lastAttempt: new Date(),
    }

    await storage.set('test-key', entry, 60)
    const retrieved = await storage.get('test-key')

    expect(retrieved).toEqual(entry)
  })

  it('increments attempt counter for new keys', async () => {
    const count = await storage.increment('new-key')
    expect(count).toBe(1)
  })

  it('increments attempt counter for existing keys', async () => {
    await storage.increment('existing-key')
    await storage.increment('existing-key')
    const count = await storage.increment('existing-key')

    expect(count).toBe(3)
  })

  it('updates lastAttempt timestamp on increment', async () => {
    const before = new Date()
    await storage.increment('test-key')

    await new Promise((resolve) => setTimeout(resolve, 10))
    await storage.increment('test-key')

    const entry = await storage.get('test-key')
    expect(entry?.lastAttempt.getTime()).toBeGreaterThan(before.getTime())
  })

  it('resets entries', async () => {
    await storage.increment('test-key')
    await storage.reset('test-key')

    const result = await storage.get('test-key')
    expect(result).toBeNull()
  })

  it('auto-expires entries after TTL', async () => {
    await storage.set('temp-key', { attempts: 1, lastAttempt: new Date() }, 0.05)

    const immediate = await storage.get('temp-key')
    expect(immediate).not.toBeNull()

    await new Promise((resolve) => setTimeout(resolve, 60))

    const afterExpiry = await storage.get('temp-key')
    expect(afterExpiry).toBeNull()
  })

  it('unrefs TTL timers so they do not keep the process alive', async () => {
    const originalSetTimeout = global.setTimeout
    const handle = {
      unrefCalled: false,
      unref() {
        this.unrefCalled = true
      },
    }

    global.setTimeout = ((fn: () => void) => {
      void fn
      return handle as any
    }) as unknown as typeof setTimeout

    try {
      await storage.set('temp-key', { attempts: 1, lastAttempt: new Date() }, 60)
      expect(handle.unrefCalled).toBe(true)
    } finally {
      global.setTimeout = originalSetTimeout
    }
  })

  it('clears all entries and timers', async () => {
    await storage.increment('key1')
    await storage.increment('key2')
    await storage.set('key3', { attempts: 5, lastAttempt: new Date() }, 60)

    storage.clear()

    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key2')).toBeNull()
    expect(await storage.get('key3')).toBeNull()
  })
})

describe('RateLimiter', () => {
  let limiter: RateLimiter
  let storage: MemoryRateLimiterStorage
  const defaultConfig: RateLimitConfig = {
    maxAttempts: 3,
    decayMinutes: 15,
    lockoutMinutes: 30,
  }

  beforeEach(() => {
    storage = new MemoryRateLimiterStorage()
    limiter = new RateLimiter(storage, defaultConfig)
  })

  describe('checkAttempt()', () => {
    it('allows first attempt with full remaining count', async () => {
      const result = await limiter.checkAttempt('user@example.com')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2)
      expect(result.reason).toBeUndefined()
    })

    it('decrements remaining attempts on each check', async () => {
      await limiter.checkAttempt('user@example.com')
      const result = await limiter.checkAttempt('user@example.com')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(1)
    })

    it('locks account after exceeding max attempts', async () => {
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      const result = await limiter.checkAttempt('user@example.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('too_many_attempts')
      expect(result.retryAfter).toBe(defaultConfig.lockoutMinutes * 60)
    })

    it('denies attempts while account is locked', async () => {
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')

      const result = await limiter.checkAttempt('user@example.com')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('account_locked')
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('uses custom prefix for different rate limit scopes', async () => {
      await limiter.checkAttempt('user@example.com', 'password-reset')
      await limiter.checkAttempt('user@example.com', 'password-reset')
      await limiter.checkAttempt('user@example.com', 'password-reset')

      const loginResult = await limiter.checkAttempt('user@example.com', 'login')
      const resetResult = await limiter.checkAttempt('user@example.com', 'password-reset')

      expect(loginResult.allowed).toBe(true)
      expect(resetResult.allowed).toBe(false)
    })

    it('resets counter after decay window expires', async () => {
      const shortDecayConfig: RateLimitConfig = {
        maxAttempts: 3,
        decayMinutes: 0.01,
        lockoutMinutes: 30,
      }
      limiter = new RateLimiter(storage, shortDecayConfig)

      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')

      await new Promise((resolve) => setTimeout(resolve, 700))

      const result = await limiter.checkAttempt('user@example.com')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2)
    })
  })

  describe('recordSuccess()', () => {
    it('resets attempt counter on successful action', async () => {
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')

      await limiter.recordSuccess('user@example.com')

      const result = await limiter.checkAttempt('user@example.com')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2)
    })

    it('uses custom prefix for scoped success recording', async () => {
      await limiter.checkAttempt('user@example.com', 'login')
      await limiter.checkAttempt('user@example.com', 'password-reset')

      await limiter.recordSuccess('user@example.com', 'login')

      const loginResult = await limiter.checkAttempt('user@example.com', 'login')
      const resetResult = await limiter.checkAttempt('user@example.com', 'password-reset')

      expect(loginResult.remainingAttempts).toBe(2)
      expect(resetResult.remainingAttempts).toBe(1)
    })
  })

  describe('unlock()', () => {
    it('manually unlocks a locked account', async () => {
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')

      let result = await limiter.checkAttempt('user@example.com')
      expect(result.allowed).toBe(false)

      await limiter.unlock('user@example.com')

      result = await limiter.checkAttempt('user@example.com')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2)
    })

    it('uses custom prefix for scoped unlocking', async () => {
      await limiter.checkAttempt('user@example.com', 'login')
      await limiter.checkAttempt('user@example.com', 'login')
      await limiter.checkAttempt('user@example.com', 'login')
      await limiter.checkAttempt('user@example.com', 'login')

      await limiter.unlock('user@example.com', 'login')

      const result = await limiter.checkAttempt('user@example.com', 'login')
      expect(result.allowed).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles concurrent attempts correctly', async () => {
      const promises = [
        limiter.checkAttempt('user@example.com'),
        limiter.checkAttempt('user@example.com'),
        limiter.checkAttempt('user@example.com'),
      ]

      const results = await Promise.all(promises)

      const allowedCount = results.filter((r) => r.allowed).length
      expect(allowedCount).toBe(3)
    })

    it('isolates different identifiers', async () => {
      await limiter.checkAttempt('user1@example.com')
      await limiter.checkAttempt('user1@example.com')
      await limiter.checkAttempt('user1@example.com')
      await limiter.checkAttempt('user1@example.com')

      const user1Result = await limiter.checkAttempt('user1@example.com')
      const user2Result = await limiter.checkAttempt('user2@example.com')

      expect(user1Result.allowed).toBe(false)
      expect(user2Result.allowed).toBe(true)
    })

    it('calculates retryAfter accurately for locked accounts', async () => {
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')
      await limiter.checkAttempt('user@example.com')

      const lockTime = Date.now()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await limiter.checkAttempt('user@example.com')

      const expectedRetry = defaultConfig.lockoutMinutes * 60
      const actualElapsed = Math.floor((Date.now() - lockTime) / 1000)

      expect(result.retryAfter).toBeLessThanOrEqual(expectedRetry)
      expect(result.retryAfter).toBeGreaterThan(expectedRetry - actualElapsed - 1)
    })
  })
})
