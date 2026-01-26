import type { CacheManager } from '@gravito/stasis'
import { CacheLockStore } from './CacheLockStore'
import type { LockStore } from './LockStore'
import { MemoryLockStore } from './MemoryLockStore'

/**
 * Manager for distributed locks to prevent concurrent task execution.
 *
 * Supports multiple storage backends (memory, cache, custom) and provides
 * a unified interface for acquiring and releasing locks.
 *
 * @example
 * ```typescript
 * // Using memory store
 * const locks = new LockManager('memory')
 *
 * // Using cache store
 * const locks = new LockManager('cache', { cache: cacheManager })
 *
 * // Acquire a lock
 * const acquired = await locks.acquire('task:send-emails', 300)
 * if (acquired) {
 *   try {
 *     // Execute task
 *   } finally {
 *     await locks.release('task:send-emails')
 *   }
 * }
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class LockManager {
  private store: LockStore

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
      // Default fallback
      this.store = new MemoryLockStore()
    }
  }

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.store.acquire(key, ttlSeconds)
  }

  async release(key: string): Promise<void> {
    return this.store.release(key)
  }

  async forceAcquire(key: string, ttlSeconds: number): Promise<void> {
    return this.store.forceAcquire(key, ttlSeconds)
  }

  async exists(key: string): Promise<boolean> {
    return this.store.exists(key)
  }
}
