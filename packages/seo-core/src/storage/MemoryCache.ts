import type { SitemapEntry } from '../interfaces'

interface CacheItem {
  entries: SitemapEntry[]
  expiresAt: number
}

export class MemoryCache {
  private cache: CacheItem | null = null
  private locked = false
  private queue: Array<(value: void) => void> = []

  constructor(private ttlSeconds: number) {}

  /**
   * Get cached entries if valid
   */
  get(): SitemapEntry[] | null {
    if (!this.cache) return null
    if (Date.now() > this.cache.expiresAt) {
      this.cache = null
      return null
    }
    return this.cache.entries
  }

  /**
   * Set cache
   */
  set(entries: SitemapEntry[]) {
    this.cache = {
      entries,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache = null
  }

  /**
   * Acquire a lock to prevent cache stampede
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
   * Release lock
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
