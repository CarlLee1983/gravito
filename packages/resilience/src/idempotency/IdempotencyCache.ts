/**
 * Idempotency cache for deduplicating events.
 * Prevents duplicate events from being processed within a configurable TTL window.
 * @internal
 */
export class IdempotencyCache {
  private cache: Map<string, { timestamp: number }> = new Map()
  private cleanupInterval: NodeJS.Timer | null = null
  private readonly defaultCleanupIntervalMs = 60000 // 1 minute

  constructor() {
    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Check if an event with the given idempotency key is a duplicate.
   * @param key - Idempotency key
   * @param ttlMs - Time-to-live in milliseconds
   * @returns True if this is a duplicate, false if it's a new event
   */
  isDuplicate(key: string, ttlMs: number): boolean {
    if (!key) {
      return false
    }

    const entry = this.cache.get(key)

    if (!entry) {
      // New key, record it and return false (not a duplicate)
      this.recordEvent(key)
      return false
    }

    // Check if the previous entry is still within TTL
    const elapsed = Date.now() - entry.timestamp
    if (elapsed < ttlMs) {
      // Within TTL, this is a duplicate
      return true
    }

    // TTL expired, treat as new event
    this.recordEvent(key)
    return false
  }

  /**
   * Record an event in the cache.
   * @param key - Idempotency key
   */
  recordEvent(key: string): void {
    if (!key) {
      return
    }
    this.cache.set(key, { timestamp: Date.now() })
  }

  /**
   * Remove an entry from the cache.
   * @param key - Idempotency key
   * @returns True if entry was removed, false if not found
   */
  remove(key: string): boolean {
    if (!key) {
      return false
    }
    return this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current cache size.
   * @returns Number of entries in cache
   */
  getSize(): number {
    return this.cache.size
  }

  /**
   * Start periodic cleanup of expired entries.
   * @internal
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return // Already running
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.defaultCleanupIntervalMs)

    // Prevent Node.js from exiting due to this interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop the periodic cleanup.
   * @internal
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clean up expired entries from the cache.
   * This is called periodically and doesn't use strict TTL checking,
   * so entries older than a reasonable default (24 hours) are removed.
   * @internal
   */
  private cleanup(): void {
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Destructor to clean up resources.
   * @internal
   */
  destroy(): void {
    this.stopCleanup()
    this.clear()
  }
}
