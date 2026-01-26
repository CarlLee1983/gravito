import type { SitemapEntry } from '../../interfaces'
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
 * @public
 * @since 3.0.0
 */
export class CachedStrategy implements SeoStrategy {
  private dynamicStrategy: DynamicStrategy
  private cache: MemoryCache

  constructor(config: SeoConfig) {
    this.dynamicStrategy = new DynamicStrategy(config)
    const ttl = config.cache?.ttl || 3600 // Default 1 hour
    this.cache = new MemoryCache(ttl)
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
   * Implements the "Cache Stampede" protection pattern (Mutex) to prevent
   * multiple concurrent requests from regenerating the sitemap simultaneously.
   *
   * @returns A promise that resolves to the array of sitemap entries.
   * @throws {Error} If fetching entries fails.
   */
  async getEntries(): Promise<SitemapEntry[]> {
    // 1. Check Cache
    const cached = this.cache.get()
    if (cached) {
      return cached
    }

    // 2. Acquire Mutex (Cache Stampede Protection)
    const isOwner = await this.cache.lock()

    // 3. Double Check Cache (in case we waited and someone else filled it)
    const cachedAfterWait = this.cache.get()
    if (cachedAfterWait) {
      if (isOwner) {
        this.cache.unlock()
      }
      return cachedAfterWait
    }

    // 4. If we are not the owner but cache is still empty (should happen rarely if logic is correct),
    // or if we are the owner: Fetch Data
    try {
      const entries = await this.dynamicStrategy.getEntries()
      this.cache.set(entries)
      return entries
    } finally {
      if (isOwner) {
        this.cache.unlock()
      }
    }
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
