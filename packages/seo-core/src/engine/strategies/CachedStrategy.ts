import type { SitemapEntry } from '../../interfaces'
import { MemoryCache } from '../../storage/MemoryCache'
import type { SeoConfig, SeoResolver } from '../../types'
import type { SeoStrategy } from '../interfaces'
import { DynamicStrategy } from './DynamicStrategy'

export class CachedStrategy implements SeoStrategy {
  private dynamicStrategy: DynamicStrategy
  private cache: MemoryCache

  constructor(private config: SeoConfig) {
    this.dynamicStrategy = new DynamicStrategy(config)
    const ttl = config.cache?.ttl || 3600 // Default 1 hour
    this.cache = new MemoryCache(ttl)
  }

  async init(): Promise<void> {
    // Optional: Pre-warm cache?
    // For now, lazy load.
  }

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
      if (isOwner) this.cache.unlock()
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

  async add(_entry: SitemapEntry): Promise<void> {
    console.warn(
      '[GravitoSeo] CachedStrategy does not support manual add(). It reflects dynamic data with TTL.'
    )
  }

  async remove(_url: string): Promise<void> {
    console.warn(
      '[GravitoSeo] CachedStrategy does not support manual remove(). It reflects dynamic data with TTL.'
    )
  }
}
