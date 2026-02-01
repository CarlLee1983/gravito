import type { CacheManager } from '@gravito/stasis'
import { CacheLockStore } from './CacheLockStore'
import type { LockStore } from './LockStore'
import { MemoryLockStore } from './MemoryLockStore'

/**
 * Orchestrator for distributed locks to prevent concurrent task execution.
 *
 * Implements a pluggable storage pattern, allowing the scheduler to operate
 * in both single-node (Memory) and multi-node (Cache/Redis) environments.
 * Provides a unified interface for safe lock acquisition and release.
 *
 * @example
 * ```typescript
 * // Production setup with distributed cache
 * const locks = new LockManager('cache', { cache: cacheManager });
 *
 * // Attempt to acquire a mutex lock for 5 minutes
 * const acquired = await locks.acquire('task:db-backup', 300);
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class LockManager {
  private store: LockStore

  /**
   * Initializes the manager with a specific storage driver.
   *
   * @param driver - Strategy identifier or a custom `LockStore` implementation.
   * @param context - Dependencies required by certain drivers (e.g., CacheManager).
   * @throws {Error} If 'cache' driver is selected but no `CacheManager` is provided.
   */
  constructor(driver: 'memory' | 'cache' | LockStore, context?: { cache?: CacheManager }) {
    if (typeof driver === 'object') {
      this.store = driver
    } else if (driver === 'memory') {
      this.store = new MemoryLockStore()
    } else if (driver === 'cache') {
      if (!context?.cache) {
        throw new Error('CacheManager is required for cache lock driver')
      }
      this.store = new CacheLockStore(context.cache)
    } else {
      // Default fallback to local memory for safe degradation
      this.store = new MemoryLockStore()
    }
  }

  /**
   * Attempts to acquire a lock. Fails if the key is already locked.
   *
   * @param key - Unique identifier for the lock.
   * @param ttlSeconds - Time-to-live in seconds before the lock expires.
   * @returns True if the lock was successfully acquired.
   */
  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.store.acquire(key, ttlSeconds)
  }

  /**
   * Explicitly releases a held lock.
   *
   * @param key - The lock identifier to remove.
   * @returns Resolves when the lock is deleted.
   */
  async release(key: string): Promise<void> {
    return this.store.release(key)
  }

  /**
   * Forcibly acquires or overwrites an existing lock.
   *
   * Used for execution locks where the latest attempt should take precedence
   * if the previous one is deemed expired.
   *
   * @param key - Lock identifier.
   * @param ttlSeconds - Expiration duration.
   */
  async forceAcquire(key: string, ttlSeconds: number): Promise<void> {
    return this.store.forceAcquire(key, ttlSeconds)
  }

  /**
   * Checks if a specific lock currently exists and is not expired.
   *
   * @param key - Lock identifier.
   * @returns True if the key is locked and active.
   */
  async exists(key: string): Promise<boolean> {
    return this.store.exists(key)
  }
}
