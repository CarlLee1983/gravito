import type { CacheManager } from '@gravito/stasis'
import type { LockStore } from './LockStore'

/**
 * Cache-based lock store using Gravito Stasis.
 *
 * Stores locks in the cache system for distributed locking
 * across multiple application instances.
 *
 * @example
 * ```typescript
 * const store = new CacheLockStore(cacheManager, 'locks:')
 * const acquired = await store.acquire('task-123', 300)
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class CacheLockStore implements LockStore {
  constructor(
    private cache: CacheManager,
    private prefix = 'scheduler:lock:'
  ) {}

  private getKey(key: string): string {
    return this.prefix + key
  }

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    // Attempt to add. If key exists, it fails (returns false).
    return this.cache.add(this.getKey(key), 'LOCKED', ttlSeconds)
  }

  async release(key: string): Promise<void> {
    await this.cache.forget(this.getKey(key))
  }

  async forceAcquire(key: string, ttlSeconds: number): Promise<void> {
    await this.cache.put(this.getKey(key), 'LOCKED', ttlSeconds)
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(this.getKey(key))
  }
}
