import type { SitemapEntry } from '../../interfaces'
import type { CacheLockProvider } from '../../storage/adapter'
import { InMemoryLockProvider } from '../../storage/InMemoryLockProvider'
import { MemoryCache } from '../../storage/MemoryCache'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'
import { DynamicStrategy } from './DynamicStrategy'

/**
 * CachedStrategy wraps the DynamicStrategy with a TTL-based memory cache.
 *
 * It provides "cache stampede" protection to ensure that multiple simultaneous
 * requests do not trigger identical heavy regeneration tasks.
 *
 * Supports pluggable lock providers for distributed environments.
 *
 * @public
 * @since 3.0.0
 */
export class CachedStrategy implements SeoStrategy {
  private dynamicStrategy: DynamicStrategy
  private cache: MemoryCache
  private lockProvider: CacheLockProvider

  constructor(config: SeoConfig) {
    this.dynamicStrategy = new DynamicStrategy(config)
    const ttl = config.cache?.ttl || 3600 // Default 1 hour
    this.cache = new MemoryCache(ttl)

    // Use provided lock provider or default to in-memory
    this.lockProvider = config.cache?.lockProvider || new InMemoryLockProvider()
  }

  /**
   * Initializes the strategy.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    // Optional: Pre-warm cache?
    // For now, lazy load.
  }

  /**
   * Retrieves sitemap entries, utilizing the cache.
   *
   * Implements the "Cache Stampede" protection pattern using distributed locks
   * to prevent multiple concurrent requests from regenerating the sitemap simultaneously.
   *
   * @returns A promise that resolves to the array of sitemap entries.
   * @throws {Error} If fetching entries fails.
   */
  async getEntries(): Promise<SitemapEntry[]> {
    // 1. Check Cache (first check)
    const cached = this.cache.get()
    if (cached) {
      return cached
    }

    // 2. Acquire Lock (Cache Stampede Protection)
    const lock = this.lockProvider.createLock('luminosity:cache:lock', 30)

    return await lock.block(10, async () => {
      // 3. Double-check cache (another instance might have populated it)
      const cachedAfterLock = this.cache.get()
      if (cachedAfterLock) {
        return cachedAfterLock
      }

      // 4. Compute and cache
      const entries = await this.dynamicStrategy.getEntries()
      this.cache.set(entries)
      return entries
    })
  }

  /**
   * Manually adds a sitemap entry.
   *
   * @param _entry - The entry to add.
   */
  async add(_entry: SitemapEntry): Promise<void> {
    console.warn(
      '[GravitoSeo] CachedStrategy does not support manual add(). It reflects dynamic data with TTL.'
    )
  }

  /**
   * Manually removes a sitemap entry.
   *
   * @param _url - The URL to remove.
   */
  async remove(_url: string): Promise<void> {
    console.warn(
      '[GravitoSeo] CachedStrategy does not support manual remove(). It reflects dynamic data with TTL.'
    )
  }
}
