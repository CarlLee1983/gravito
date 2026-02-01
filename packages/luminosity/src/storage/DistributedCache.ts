import type { SitemapEntry } from '../interfaces'
import type { CacheLockProvider } from './adapter'

/**
 * Configuration for distributed cache with locking.
 *
 * @public
 * @since 3.1.0
 */
export interface DistributedCacheConfig {
  /** Time-to-live for cached entries in seconds. */
  ttlSeconds: number

  /** Factory for creating distributed locks. */
  lockProvider: CacheLockProvider

  /** Cache storage backend. */
  cacheStore: {
    get(key: string): Promise<SitemapEntry[] | null>
    set(key: string, value: SitemapEntry[], ttl: number): Promise<void>
  }
}

/**
 * Distributed cache with lock-based synchronization.
 *
 * Prevents cache stampede in multi-instance environments by using
 * distributed locks to coordinate cache regeneration.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const cache = new DistributedCache({
 *   ttlSeconds: 3600,
 *   lockProvider: redisLockProvider,
 *   cacheStore: {
 *     get: async (key) => await redis.get(key),
 *     set: async (key, val, ttl) => await redis.setex(key, ttl, val)
 *   }
 * });
 *
 * const entries = await cache.getOrCompute(async () => {
 *   return await generateSitemapEntries();
 * });
 * ```
 */
export class DistributedCache {
  private readonly CACHE_KEY = 'luminosity:sitemap:entries'
  private readonly LOCK_KEY = 'luminosity:sitemap:lock'

  constructor(private config: DistributedCacheConfig) {}

  /**
   * Get cached entries or compute them if missing.
   *
   * Uses distributed locking to prevent multiple instances from
   * regenerating the cache simultaneously (cache stampede prevention).
   *
   * @param computeFn - Function to compute entries if cache miss.
   * @returns The sitemap entries (from cache or freshly computed).
   *
   * @example
   * ```typescript
   * const entries = await cache.getOrCompute(async () => {
   *   // Expensive computation
   *   return await fetchAllUrls();
   * });
   * ```
   */
  async getOrCompute(computeFn: () => Promise<SitemapEntry[]>): Promise<SitemapEntry[]> {
    // 1. Check cache (first check)
    const cached = await this.config.cacheStore.get(this.CACHE_KEY)
    if (cached) {
      return cached
    }

    // 2. Acquire distributed lock
    const lock = this.config.lockProvider.createLock(this.LOCK_KEY, 30)

    return await lock.block(10, async () => {
      // 3. Double-check cache (another instance might have populated it)
      const cachedAfterLock = await this.config.cacheStore.get(this.CACHE_KEY)
      if (cachedAfterLock) {
        return cachedAfterLock
      }

      // 4. Compute and cache
      const entries = await computeFn()
      await this.config.cacheStore.set(this.CACHE_KEY, entries, this.config.ttlSeconds)

      return entries
    })
  }

  /**
   * Invalidate the cache.
   *
   * Forces the next call to getOrCompute to regenerate entries.
   */
  async invalidate(): Promise<void> {
    // Note: This assumes cacheStore has a delete method
    // For now, we set an empty array with 0 TTL
    await this.config.cacheStore.set(this.CACHE_KEY, [], 0)
  }
}
