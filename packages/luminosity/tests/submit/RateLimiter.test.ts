import { describe, expect, it } from 'bun:test'
import { createRateLimiter, RateLimiter } from '../../src/submit/RateLimiter'

describe('RateLimiter', () => {
  describe('constructor', () => {
    it('should initialize with full tokens', () => {
      const limiter = new RateLimiter(10, 5)
      expect(limiter.getAvailableTokens()).toBe(10)
    })
  })

  describe('tryAcquire()', () => {
    it('should acquire a single token when available', () => {
      const limiter = new RateLimiter(10, 5)
      expect(limiter.tryAcquire()).toBe(true)
      expect(limiter.getAvailableTokens()).toBe(9)
    })

    it('should acquire multiple tokens at once', () => {
      const limiter = new RateLimiter(10, 5)
      expect(limiter.tryAcquire(5)).toBe(true)
      expect(limiter.getAvailableTokens()).toBe(5)
    })

    it('should return false when insufficient tokens', () => {
      const limiter = new RateLimiter(2, 1)
      expect(limiter.tryAcquire(3)).toBe(false)
      // 未消耗的 token 應維持不變
      expect(limiter.getAvailableTokens()).toBe(2)
    })

    it('should return false after all tokens consumed', () => {
      const limiter = new RateLimiter(1, 1)
      expect(limiter.tryAcquire()).toBe(true)
      expect(limiter.tryAcquire()).toBe(false)
    })
  })

  describe('acquire()', () => {
    it('should resolve immediately when tokens available', async () => {
      const limiter = new RateLimiter(10, 5)
      await limiter.acquire()
      expect(limiter.getAvailableTokens()).toBe(9)
    })

    it('should acquire multiple tokens', async () => {
      const limiter = new RateLimiter(10, 5)
      await limiter.acquire(3)
      expect(limiter.getAvailableTokens()).toBe(7)
    })

    it('should wait and resolve when tokens refill', async () => {
      // 高速率以確保快速補充
      const limiter = new RateLimiter(1, 100)
      // 消耗所有 tokens
      limiter.tryAcquire()
      expect(limiter.getAvailableTokens()).toBe(0)

      // 應等待直到 token 補充
      await limiter.acquire()
      // acquire 成功，表示等待並獲得了 token
    })
  })

  describe('getAvailableTokens()', () => {
    it('should return current token count', () => {
      const limiter = new RateLimiter(5, 2)
      expect(limiter.getAvailableTokens()).toBe(5)
    })

    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter(10, 100) // 每秒 100 tokens
      limiter.tryAcquire(10) // 全部消耗
      expect(limiter.getAvailableTokens()).toBe(0)

      await new Promise((resolve) => setTimeout(resolve, 60))
      // 經過 60ms，應補充約 6 tokens (100/s * 0.06s)
      const tokens = limiter.getAvailableTokens()
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThanOrEqual(10)
    })

    it('should not exceed max tokens', async () => {
      const limiter = new RateLimiter(5, 100)
      await new Promise((resolve) => setTimeout(resolve, 200))
      // 即使經過很長時間，也不應超過 maxTokens
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(5)
    })
  })

  describe('reset()', () => {
    it('should restore tokens to max capacity', () => {
      const limiter = new RateLimiter(10, 5)
      limiter.tryAcquire(8)
      expect(limiter.getAvailableTokens()).toBe(2)

      limiter.reset()
      expect(limiter.getAvailableTokens()).toBe(10)
    })
  })
})

describe('createRateLimiter()', () => {
  it('should create limiter from requestsPerSecond', () => {
    const limiter = createRateLimiter({ requestsPerSecond: 10 })
    expect(limiter).toBeInstanceOf(RateLimiter)
    // burstCapacity = 10 * 2 = 20
    expect(limiter.getAvailableTokens()).toBe(20)
  })

  it('should create limiter from requestsPerMinute', () => {
    const limiter = createRateLimiter({ requestsPerMinute: 600 })
    expect(limiter).toBeInstanceOf(RateLimiter)
    // perSecond = 600/60 = 10, burstCapacity = 10 * 10 = 100
    expect(limiter.getAvailableTokens()).toBe(100)
  })

  it('should create limiter from requestsPerHour', () => {
    const limiter = createRateLimiter({ requestsPerHour: 3600 })
    expect(limiter).toBeInstanceOf(RateLimiter)
    // perSecond = 3600/3600 = 1, burstCapacity = 1 * 60 = 60
    expect(limiter.getAvailableTokens()).toBe(60)
  })

  it('should use the most restrictive rate when multiple configured', () => {
    const limiter = createRateLimiter({
      requestsPerSecond: 10,
      requestsPerMinute: 120, // 2/s - 更限制
    })
    expect(limiter).toBeInstanceOf(RateLimiter)
  })

  it('should throw when no rate limit specified', () => {
    expect(() => createRateLimiter({})).toThrow('At least one rate limit must be specified')
  })

  it('should handle all three rate limits together', () => {
    const limiter = createRateLimiter({
      requestsPerSecond: 10,
      requestsPerMinute: 300,
      requestsPerHour: 10000,
    })
    expect(limiter).toBeInstanceOf(RateLimiter)
  })
})
