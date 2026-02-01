import type { GroupRedisClient } from '../drivers/RedisDriver'

/**
 * Configuration options for distributed locks.
 *
 * Defines the time-to-live (TTL), retry strategy, and automatic renewal behavior for a lock.
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const options: LockOptions = {
 *   ttl: 60000,           // Lock held for 60 seconds
 *   retryCount: 3,        // Retry 3 times on failure
 *   retryDelay: 100,      // Wait 100ms between retries
 *   refreshInterval: 20000 // Auto-renew every 20 seconds
 * };
 * ```
 */
export interface LockOptions {
  /**
   * Time-to-live for the lock in milliseconds.
   *
   * The lock will automatically expire if the holder does not release or renew it
   * before this duration elapses.
   */
  ttl: number

  /**
   * Number of retry attempts if lock acquisition fails.
   *
   * Set to 0 to disable retries.
   */
  retryCount: number

  /**
   * Delay between retry attempts in milliseconds.
   */
  retryDelay: number

  /**
   * Interval for automatic lock renewal in milliseconds.
   *
   * If set, the lock will automatically extend its TTL every `refreshInterval`.
   * Recommended value is 1/3 of the `ttl`.
   *
   * @optional
   */
  refreshInterval?: number
}

/**
 * Distributed lock implementation based on Redis (Redlock style).
 *
 * Provides mutual exclusion in a distributed environment, ensuring only one node
 * holds a specific lock at a time. Supports automatic renewal, retry mechanisms,
 * and safe release (only the holder can release).
 *
 * @public
 * @since 3.1.0
 * @example
 * ```typescript
 * const lock = new DistributedLock(redisClient);
 *
 * const acquired = await lock.acquire('my-resource', {
 *   ttl: 60000,
 *   retryCount: 3,
 *   retryDelay: 100,
 *   refreshInterval: 20000
 * });
 *
 * if (acquired) {
 *   try {
 *     // Perform exclusive operation
 *   } finally {
 *     await lock.release('my-resource');
 *   }
 * }
 * ```
 */
export class DistributedLock {
  /**
   * Unique identifier for this lock instance.
   * Used to ensure only the owner can release the lock.
   */
  private lockId = crypto.randomUUID()

  /**
   * Timer for automatic renewal.
   */
  private refreshTimer: NodeJS.Timeout | null = null

  /**
   * The key of the currently held lock.
   */
  private currentLockKey: string | null = null

  /**
   * Creates a DistributedLock instance.
   *
   * @param client - Redis client instance. Must support SET, DEL, and EVAL commands.
   */
  constructor(private client: GroupRedisClient) {}

  /**
   * Attempts to acquire a distributed lock for the specified key.
   *
   * Uses Redis `SET key value EX ttl NX` for atomic acquisition.
   * If the lock is held by another node, it retries according to `retryCount`.
   * Upon success, if `refreshInterval` is set, automatic renewal starts.
   *
   * @param key - The lock key. Use a meaningful resource identifier.
   * @param options - Configuration options for the lock.
   * @returns `true` if the lock was acquired, `false` otherwise.
   *
   * @throws {Error} If the Redis client does not support the SET command.
   *
   * @example
   * ```typescript
   * const acquired = await lock.acquire('schedule:job-123', {
   *   ttl: 30000,
   *   retryCount: 5,
   *   retryDelay: 200
   * });
   *
   * if (!acquired) {
   *   console.log('Resource is currently locked by another node');
   * }
   * ```
   */
  async acquire(key: string, options: LockOptions): Promise<boolean> {
    if (typeof this.client.set !== 'function') {
      throw new Error('[DistributedLock] Redis client does not support SET command')
    }

    const ttlSeconds = Math.ceil(options.ttl / 1000)
    let attempts = 0

    while (attempts <= options.retryCount) {
      try {
        // Use SET key value EX ttl NX for atomic acquisition
        const result = await this.client.set(key, this.lockId, 'EX', ttlSeconds, 'NX')

        if (result === 'OK') {
          this.currentLockKey = key

          if (options.refreshInterval) {
            this.startRefresh(key, options)
          }

          return true
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(`[DistributedLock] Failed to acquire lock for ${key}:`, err.message)
      }

      attempts++
      if (attempts <= options.retryCount) {
        await this.sleep(options.retryDelay)
      }
    }

    return false
  }

  /**
   * Releases the lock for the specified key.
   *
   * Uses a Lua script to ensure atomicity: the lock is deleted ONLY if the value matches
   * this instance's `lockId`. This prevents deleting locks held by others.
   * Stops the auto-renewal timer upon success.
   *
   * @param key - The lock key to release.
   *
   * @throws {Error} If the Redis client does not support the EVAL command.
   *
   * @example
   * ```typescript
   * await lock.release('schedule:job-123');
   * ```
   */
  async release(key: string): Promise<void> {
    this.stopRefresh()

    if (typeof this.client.eval !== 'function') {
      throw new Error('[DistributedLock] Redis client does not support EVAL command')
    }

    try {
      // Lua script: verify ownership before deletion
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `

      await this.client.eval(script, 1, key, this.lockId)
      this.currentLockKey = null
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`[DistributedLock] Failed to release lock for ${key}:`, err.message)
    }
  }

  /**
   * Starts the automatic renewal mechanism.
   *
   * Periodically extends the lock's TTL to prevent expiration during long-running tasks.
   * Uses a Lua script to ensure only owned locks are renewed.
   *
   * @param key - The lock key.
   * @param options - Lock options containing `refreshInterval`.
   */
  private startRefresh(key: string, options: LockOptions): void {
    if (!options.refreshInterval) {
      return
    }

    this.stopRefresh()

    const ttlSeconds = Math.ceil(options.ttl / 1000)

    this.refreshTimer = setInterval(async () => {
      try {
        if (typeof this.client.eval !== 'function') {
          console.error('[DistributedLock] Redis client does not support EVAL command for refresh')
          return
        }

        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
          else
            return 0
          end
        `

        const result = await this.client.eval(script, 1, key, this.lockId, ttlSeconds)

        if (result === 0) {
          console.warn(
            `[DistributedLock] Lock ${key} no longer held by this instance, stopping refresh`
          )
          this.stopRefresh()
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(`[DistributedLock] Failed to refresh lock ${key}:`, err.message)
      }
    }, options.refreshInterval)
  }

  /**
   * Stops the automatic renewal timer.
   */
  private stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Helper for delay.
   *
   * @param ms - Milliseconds to sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Checks if the specified lock is currently held by this instance.
   *
   * @param key - The lock key.
   * @returns `true` if held, `false` otherwise.
   *
   * @example
   * ```typescript
   * if (lock.isHeld('schedule:job-123')) {
   *   console.log('Lock is active');
   * }
   * ```
   */
  isHeld(key: string): boolean {
    return this.currentLockKey === key
  }
}
