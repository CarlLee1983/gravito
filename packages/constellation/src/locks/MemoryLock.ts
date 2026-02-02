import type { SitemapLock } from '../types'

/**
 * In-memory implementation of SitemapLock for single-instance deployments.
 *
 * **Warning**: This lock implementation is NOT suitable for distributed environments
 * (e.g., Kubernetes, multi-instance deployments). Use RedisLock instead for those scenarios.
 *
 * MemoryLock stores lock state in local memory using a Map. It automatically handles
 * lock expiration based on TTL and provides basic mutual exclusion within a single process.
 *
 * @example
 * ```typescript
 * const lock = new MemoryLock()
 *
 * const acquired = await lock.acquire('sitemap-generation', 60000) // 60 seconds TTL
 * if (acquired) {
 *   try {
 *     // Perform exclusive operation
 *     await generateSitemap()
 *   } finally {
 *     await lock.release('sitemap-generation')
 *   }
 * }
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class MemoryLock implements SitemapLock {
  /**
   * Map of resource identifiers to their lock expiration timestamps (in milliseconds).
   */
  private locks = new Map<string, number>()

  /**
   * Attempts to acquire a lock on the specified resource.
   *
   * If the resource is already locked and hasn't expired, this method returns `false`.
   * If the resource is unlocked or the lock has expired, it acquires the lock and returns `true`.
   *
   * @param resource - Unique identifier for the resource to lock (e.g., 'sitemap.xml').
   * @param ttl - Time-to-live for the lock in milliseconds.
   * @returns A promise resolving to `true` if the lock was acquired, `false` otherwise.
   *
   * @example
   * ```typescript
   * const lock = new MemoryLock()
   * const acquired = await lock.acquire('sitemap-generation', 60000)
   *
   * if (!acquired) {
   *   console.log('Another process is already generating the sitemap')
   *   return
   * }
   * ```
   */
  async acquire(resource: string, ttl: number): Promise<boolean> {
    const now = Date.now()
    const expiresAt = this.locks.get(resource)

    if (expiresAt && expiresAt > now) {
      return false
    }

    this.locks.set(resource, now + ttl)
    return true
  }

  /**
   * Releases the lock on the specified resource.
   *
   * This immediately removes the lock, allowing other processes to acquire it.
   *
   * @param resource - The resource identifier to unlock.
   *
   * @example
   * ```typescript
   * await lock.release('sitemap-generation')
   * ```
   */
  async release(resource: string): Promise<void> {
    this.locks.delete(resource)
  }

  /**
   * Checks if a resource is currently locked.
   *
   * Automatically cleans up expired locks during the check.
   *
   * @param resource - The resource identifier to check.
   * @returns A promise resolving to `true` if the resource is locked, `false` otherwise.
   *
   * @example
   * ```typescript
   * const isLocked = await lock.isLocked('sitemap-generation')
   * ```
   */
  async isLocked(resource: string): Promise<boolean> {
    const expiresAt = this.locks.get(resource)
    if (!expiresAt) {
      return false
    }

    const now = Date.now()
    if (expiresAt <= now) {
      this.locks.delete(resource)
      return false
    }

    return true
  }

  /**
   * Clears all locks from memory.
   *
   * This is primarily useful for testing or application shutdown.
   *
   * @example
   * ```typescript
   * await lock.clear()
   * ```
   */
  async clear(): Promise<void> {
    this.locks.clear()
  }

  /**
   * Gets the number of active locks (including expired ones).
   *
   * This is primarily useful for debugging and testing.
   *
   * @returns The number of locks currently stored in memory.
   */
  size(): number {
    return this.locks.size
  }
}
