/**
 * Rate limiting service for authentication operations
 * Prevents brute-force attacks by limiting attempts per identifier (email/IP)
 */

export interface RateLimitEntry {
  /** Number of attempts made within the current window */
  attempts: number
  /** Timestamp of the last attempt */
  lastAttempt: Date
  /** If set, the identifier is locked until this time */
  lockedUntil?: Date
}

export interface RateLimitResult {
  /** Whether the action is allowed */
  allowed: boolean
  /** Remaining attempts before lockout (if allowed) */
  remainingAttempts?: number
  /** Seconds to wait before retry (if not allowed) */
  retryAfter?: number
  /** Reason for denial */
  reason?: 'account_locked' | 'too_many_attempts'
}

export interface RateLimitRule {
  /** Maximum attempts before lockout */
  maxAttempts: number
  /** Time window for attempts (minutes) */
  decayMinutes: number
  /** How long to lock after exceeding attempts (minutes) */
  lockoutMinutes: number
}

/**
 * Storage backend interface for rate limit entries
 */
export interface RateLimiterStorage {
  /** Get a rate limit entry by key */
  get(key: string): Promise<RateLimitEntry | null>
  /** Set a rate limit entry with TTL (seconds) */
  set(key: string, entry: RateLimitEntry, ttl: number): Promise<void>
  /** Increment attempt counter and return new count */
  increment(key: string): Promise<number>
  /** Reset/delete a rate limit entry */
  reset(key: string): Promise<void>
}

/**
 * In-memory storage backend (suitable for single-instance deployments)
 */
export class MemoryRateLimiterStorage implements RateLimiterStorage {
  private store = new Map<string, RateLimitEntry>()
  private timers = new Map<string, NodeJS.Timeout>()

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null
  }

  async set(key: string, entry: RateLimitEntry, ttl: number): Promise<void> {
    this.store.set(key, entry)

    // Clear existing timer if any
    const existingTimer = this.timers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set auto-expiration
    const timer = setTimeout(() => {
      this.store.delete(key)
      this.timers.delete(key)
    }, ttl * 1000)
    timer.unref?.()

    this.timers.set(key, timer)
  }

  async increment(key: string): Promise<number> {
    const existing = this.store.get(key)
    const now = new Date()

    if (existing) {
      existing.attempts++
      existing.lastAttempt = now
      return existing.attempts
    } else {
      const entry: RateLimitEntry = {
        attempts: 1,
        lastAttempt: now,
      }
      this.store.set(key, entry)
      return 1
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear()
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }
}

/**
 * Rate limiter for authentication operations
 */
export class RateLimiter {
  constructor(
    private storage: RateLimiterStorage,
    private config: RateLimitRule
  ) {}

  /**
   * Check if an attempt is allowed for the given identifier
   */
  async checkAttempt(identifier: string, prefix = 'login'): Promise<RateLimitResult> {
    const key = `${prefix}:${identifier}`
    const entry = await this.storage.get(key)

    // Check if currently locked
    if (entry?.lockedUntil && new Date() < entry.lockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.lockedUntil.getTime() - Date.now()) / 1000),
        reason: 'account_locked',
      }
    }

    // Check if should reset due to decay window expiration
    if (entry && this.isDecayExpired(entry)) {
      await this.storage.reset(key)
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts,
      }
    }

    // Get current attempt count
    const currentAttempts = entry?.attempts || 0

    // Check if already exceeded limit
    if (currentAttempts >= this.config.maxAttempts) {
      await this.lockAccount(key)
      return {
        allowed: false,
        retryAfter: this.config.lockoutMinutes * 60,
        reason: 'too_many_attempts',
      }
    }

    // Increment and check
    const newAttempts = await this.storage.increment(key)
    const ttl = this.config.decayMinutes * 60

    await this.storage.set(
      key,
      {
        attempts: newAttempts,
        lastAttempt: new Date(),
      },
      ttl
    )

    return {
      allowed: true,
      remainingAttempts: this.config.maxAttempts - newAttempts,
    }
  }

  /**
   * Record a successful action (resets the counter)
   */
  async recordSuccess(identifier: string, prefix = 'login'): Promise<void> {
    const key = `${prefix}:${identifier}`
    await this.storage.reset(key)
  }

  /**
   * Lock an account/identifier
   */
  private async lockAccount(key: string): Promise<void> {
    const lockedUntil = new Date(Date.now() + this.config.lockoutMinutes * 60 * 1000)
    const ttl = this.config.lockoutMinutes * 60

    await this.storage.set(
      key,
      {
        attempts: this.config.maxAttempts,
        lastAttempt: new Date(),
        lockedUntil,
      },
      ttl
    )
  }

  /**
   * Check if the decay window has expired
   */
  private isDecayExpired(entry: RateLimitEntry): boolean {
    const decayMs = this.config.decayMinutes * 60 * 1000
    return Date.now() - entry.lastAttempt.getTime() > decayMs
  }

  /**
   * Manually unlock an identifier (for admin purposes)
   */
  async unlock(identifier: string, prefix = 'login'): Promise<void> {
    const key = `${prefix}:${identifier}`
    await this.storage.reset(key)
  }
}
