import type { SitemapEntry } from '../interfaces'

interface CacheItem {
  entries: SitemapEntry[]
  expiresAt: number
}

/**
 * MemoryCache provides a simple TTL-based in-memory cache for sitemap entries.
 *
 * It includes a primitive locking mechanism to prevent "cache stampede"
 * (multiple simultaneous requests triggering identical heavy generation tasks).
 *
 * @public
 * @since 3.0.0
 */
export class MemoryCache {
  private cache: CacheItem | null = null
  private locked = false
  private queue: Array<() => void> = []

  constructor(private ttlSeconds: number) {}

  /**
   * Get cached entries if valid.
   *
   * @returns The cached entries, or null if cache is empty or expired.
   */
  get(): SitemapEntry[] | null {
    if (!this.cache) {
      return null
    }
    if (Date.now() > this.cache.expiresAt) {
      this.cache = null
      return null
    }
    return this.cache.entries
  }

  /**
   * Set cache with entries and calculate expiration based on TTL.
   *
   * @param entries - The sitemap entries to cache.
   */
  set(entries: SitemapEntry[]) {
    this.cache = {
      entries,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    }
  }

  /**
   * Clear the cache manually.
   */
  clear() {
    this.cache = null
  }

  /**
   * Acquire a lock to prevent cache stampede.
   *
   * @returns A promise resolving to `true` if the lock was acquired (you must populate cache),
   *          or `false` if you waited and should check the cache again.
   */
  async lock(): Promise<boolean> {
    if (!this.locked) {
      this.locked = true
      return true
    }

    // Wait for unlock
    return new Promise<boolean>((resolve) => {
      this.queue.push(() => resolve(false)) // Resolve false means "someone else did the work, check cache again"
    })
  }

  /**
   * Release lock and wake up the next waiter.
   */
  unlock() {
    this.locked = false
    // Wake up one waiter
    const next = this.queue.shift()
    if (next) {
      // We pass strict control or just notify?
      // Simplest Mutex for Cache Stampede:
      // The one who gets the lock does the work.
      // The others wait. When unlocked, they check cache again.
      // If I wake them up, they should re-call logic.
      // For this simple implementation, let's just run the callback.
      next()
    }
  }
}
