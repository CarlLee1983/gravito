/**
 * Idempotency cache for deduplicating events.
 * Prevents duplicate events from being processed within a configurable TTL window.
 * @internal
 */
export declare class IdempotencyCache {
  private cache
  private cleanupInterval
  private readonly defaultCleanupIntervalMs
  constructor()
  /**
   * Check if an event with the given idempotency key is a duplicate.
   * @param key - Idempotency key
   * @param ttlMs - Time-to-live in milliseconds
   * @returns True if this is a duplicate, false if it's a new event
   */
  isDuplicate(key: string, ttlMs: number): boolean
  /**
   * Record an event in the cache.
   * @param key - Idempotency key
   */
  recordEvent(key: string): void
  /**
   * Remove an entry from the cache.
   * @param key - Idempotency key
   * @returns True if entry was removed, false if not found
   */
  remove(key: string): boolean
  /**
   * Clear all entries from the cache.
   */
  clear(): void
  /**
   * Get the current cache size.
   * @returns Number of entries in cache
   */
  getSize(): number
  /**
   * Start periodic cleanup of expired entries.
   * @internal
   */
  private startCleanup
  /**
   * Stop the periodic cleanup.
   * @internal
   */
  stopCleanup(): void
  /**
   * Clean up expired entries from the cache.
   * This is called periodically and doesn't use strict TTL checking,
   * so entries older than a reasonable default (24 hours) are removed.
   * @internal
   */
  private cleanup
  /**
   * Destructor to clean up resources.
   * @internal
   */
  destroy(): void
}
