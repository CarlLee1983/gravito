import type { CacheManager } from '@gravito/stasis'
import type { LockStore } from './LockStore'

/**
 * Distributed lock implementation backed by Gravito Stasis.
 *
 * Leverages the shared cache system (Redis, Memcached, etc.) to provide
 * atomic locking across multiple application nodes.
 *
 * @example
 * ```typescript
 * const store = new CacheLockStore(cacheManager);
 * const locked = await store.acquire('nightly-sync', 600);
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class CacheLockStore implements LockStore {
  /**
   * Initializes the store with a cache manager.
   *
   * @param cache - The Stasis cache instance.
   * @param prefix - Key prefix to avoid collisions in the shared namespace.
   */
  constructor(
    private cache: CacheManager,
    private prefix = 'scheduler:lock:'
  ) {}

  /**
   * Computes the fully qualified cache key.
   *
   * @internal
   */
  private getKey(key: string): string {
    return this.prefix + key
  }

  /**
   * Atomic 'add' operation ensures only one node succeeds.
   *
   * @param key - Lock key.
   * @param ttlSeconds - Expiration.
   */
  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.cache.add(this.getKey(key), 'LOCKED', ttlSeconds)
  }

  /**
   * Removes the lock key from cache.
   *
   * @param key - Lock key.
   */
  async release(key: string): Promise<void> {
    await this.cache.forget(this.getKey(key))
  }

  /**
   * Overwrites the lock key, effectively resetting the TTL.
   *
   * @param key - Lock key.
   * @param ttlSeconds - New expiration.
   */
  async forceAcquire(key: string, ttlSeconds: number): Promise<void> {
    await this.cache.put(this.getKey(key), 'LOCKED', ttlSeconds)
  }

  /**
   * Validates if the lock key is present in the cache.
   *
   * @param key - Lock key.
   */
  async exists(key: string): Promise<boolean> {
    return this.cache.has(this.getKey(key))
  }
}
