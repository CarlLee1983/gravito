import type { SitemapLock } from '../types'

/**
 * In-memory lock implementation for single-instance sitemap generation.
 *
 * Provides mutex-style mutual exclusion within a single Node.js process using a Map-based
 * storage mechanism. Designed for development environments and single-instance deployments
 * where distributed coordination is not required.
 *
 * **When to use:**
 * - Development and testing environments
 * - Single-instance production deployments (e.g., single Docker container)
 * - Scenarios where Redis infrastructure is unavailable
 *
 * **When NOT to use:**
 * - Kubernetes or multi-instance deployments (use {@link RedisLock} instead)
 * - Horizontally scaled applications
 * - Any environment requiring cross-process synchronization
 *
 * **Design rationale:**
 * - Zero external dependencies (no Redis, no database)
 * - Automatic TTL-based lock expiration to prevent deadlocks
 * - Synchronous cleanup of expired locks during read operations
 * - Fast in-process performance with O(1) lock operations
 *
 * @example Basic usage with try-finally pattern
 * ```typescript
 * import { MemoryLock } from '@gravito/constellation'
 *
 * const lock = new MemoryLock()
 *
 * // Attempt to acquire lock with 60-second TTL
 * const acquired = await lock.acquire('sitemap-generation', 60000)
 * if (acquired) {
 *   try {
 *     // Perform exclusive operation
 *     await generateSitemap()
 *   } finally {
 *     // Always release lock to prevent resource leakage
 *     await lock.release('sitemap-generation')
 *   }
 * } else {
 *   console.log('Another process is generating sitemap, skipping')
 * }
 * ```
 *
 * @example Handling lock contention
 * ```typescript
 * const lock = new MemoryLock()
 *
 * if (!await lock.acquire('expensive-operation', 30000)) {
 *   return new Response('Service busy, try again later', {
 *     status: 503,
 *     headers: { 'Retry-After': '30' }
 *   })
 * }
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class MemoryLock implements SitemapLock {
  /**
   * Internal map storing resource identifiers to their lock expiration timestamps.
   *
   * Keys represent unique resource identifiers (e.g., 'sitemap-generation').
   * Values are Unix timestamps in milliseconds representing when the lock expires.
   * Expired locks are automatically cleaned up during `acquire()` and `isLocked()` calls.
   */
  private locks = new Map<string, number>()

  /**
   * Attempts to acquire an exclusive lock on the specified resource.
   *
   * Uses a test-and-set approach: checks if the lock exists and is valid, then atomically
   * sets the lock if available. Expired locks are treated as available and automatically
   * replaced during acquisition.
   *
   * **Behavior:**
   * - Returns `true` if lock was successfully acquired
   * - Returns `false` if resource is already locked by another caller
   * - Automatically replaces expired locks (acts as self-healing mechanism)
   * - Lock automatically expires after TTL milliseconds
   *
   * **Race condition handling:**
   * Safe within a single process due to JavaScript's single-threaded event loop.
   * NOT safe across multiple processes or instances (use RedisLock for that).
   *
   * @param resource - Unique identifier for the resource to lock (e.g., 'sitemap-generation', 'blog-index').
   *                   Should be consistent across all callers attempting to lock the same resource.
   * @param ttl - Time-to-live in milliseconds. Lock automatically expires after this duration.
   *              Recommended: 2-5x the expected operation duration to prevent premature expiration.
   * @returns Promise resolving to `true` if lock acquired, `false` if already locked.
   *
   * @example Preventing concurrent sitemap generation
   * ```typescript
   * const lock = new MemoryLock()
   * const acquired = await lock.acquire('sitemap-generation', 60000)
   *
   * if (!acquired) {
   *   console.log('Another process is already generating the sitemap')
   *   return new Response('Generation in progress', { status: 503 })
   * }
   *
   * try {
   *   await generateSitemap()
   * } finally {
   *   await lock.release('sitemap-generation')
   * }
   * ```
   *
   * @example Setting appropriate TTL
   * ```typescript
   * // For fast operations (< 1 second), use short TTL
   * await lock.acquire('cache-refresh', 5000)
   *
   * // For slow operations (minutes), use longer TTL
   * await lock.acquire('full-reindex', 300000) // 5 minutes
   * ```
   */
  async acquire(resource: string, ttl: number): Promise<boolean> {
    const now = Date.now()
    const expiresAt = this.locks.get(resource)

    // Lock exists and hasn't expired yet
    if (expiresAt && expiresAt > now) {
      return false
    }

    // Lock doesn't exist or has expired - acquire it
    this.locks.set(resource, now + ttl)
    return true
  }

  /**
   * Releases the lock on the specified resource, allowing others to acquire it.
   *
   * Immediately removes the lock from memory without any ownership validation.
   * Unlike RedisLock, this does NOT verify that the caller is the lock owner,
   * so callers must ensure they only release locks they acquired.
   *
   * **Best practices:**
   * - Always call `release()` in a `finally` block to prevent lock leakage
   * - Only release locks you successfully acquired
   * - If operation fails, still release the lock to allow retry
   *
   * **Idempotency:**
   * Safe to call multiple times on the same resource. Releasing a non-existent
   * lock is a no-op.
   *
   * @param resource - The resource identifier to unlock. Must match the identifier
   *                   used in the corresponding `acquire()` call.
   *
   * @example Proper release pattern with try-finally
   * ```typescript
   * const acquired = await lock.acquire('sitemap-generation', 60000)
   * if (!acquired) return
   *
   * try {
   *   await generateSitemap()
   * } finally {
   *   // Always release, even if operation throws
   *   await lock.release('sitemap-generation')
   * }
   * ```
   *
   * @example Handling operation failures
   * ```typescript
   * const acquired = await lock.acquire('data-import', 120000)
   * if (!acquired) return
   *
   * try {
   *   await importData()
   * } catch (error) {
   *   console.error('Import failed:', error)
   *   // Lock still released in finally block
   *   throw error
   * } finally {
   *   await lock.release('data-import')
   * }
   * ```
   */
  async release(resource: string): Promise<void> {
    this.locks.delete(resource)
  }

  /**
   * Checks whether a resource is currently locked and has not expired.
   *
   * Performs automatic cleanup by removing expired locks during the check,
   * ensuring the internal map doesn't accumulate stale entries over time.
   *
   * **Use cases:**
   * - Pre-flight checks before attempting expensive operations
   * - Status monitoring and health checks
   * - Implementing custom retry logic
   * - Debugging and testing
   *
   * **Side effects:**
   * Automatically deletes expired locks as a garbage collection mechanism.
   * This is intentional to prevent memory leaks from abandoned locks.
   *
   * @param resource - The resource identifier to check for lock status.
   * @returns Promise resolving to `true` if resource is actively locked (not expired),
   *          `false` if unlocked or lock has expired.
   *
   * @example Pre-flight check before starting work
   * ```typescript
   * const lock = new MemoryLock()
   *
   * if (await lock.isLocked('sitemap-generation')) {
   *   console.log('Sitemap generation already in progress')
   *   return
   * }
   *
   * // Safe to proceed
   * await lock.acquire('sitemap-generation', 60000)
   * ```
   *
   * @example Health check endpoint
   * ```typescript
   * app.get('/health/locks', async (c) => {
   *   const isGenerating = await lock.isLocked('sitemap-generation')
   *   const isIndexing = await lock.isLocked('search-indexing')
   *
   *   return c.json({
   *     sitemapGeneration: isGenerating ? 'in-progress' : 'idle',
   *     searchIndexing: isIndexing ? 'in-progress' : 'idle'
   *   })
   * })
   * ```
   *
   * @example Custom retry logic
   * ```typescript
   * let attempts = 0
   * while (attempts < 5) {
   *   if (!await lock.isLocked('resource')) {
   *     const acquired = await lock.acquire('resource', 10000)
   *     if (acquired) break
   *   }
   *   await sleep(1000)
   *   attempts++
   * }
   * ```
   */
  async isLocked(resource: string): Promise<boolean> {
    const expiresAt = this.locks.get(resource)
    if (!expiresAt) {
      return false
    }

    const now = Date.now()
    if (expiresAt <= now) {
      // Automatic garbage collection: remove expired lock
      this.locks.delete(resource)
      return false
    }

    return true
  }

  /**
   * Clears all locks from memory, including both active and expired locks.
   *
   * **Use cases:**
   * - Test cleanup between test cases to ensure isolation
   * - Application shutdown to release all resources
   * - Manual intervention during debugging
   * - Resetting state after catastrophic errors
   *
   * **Warning:**
   * This forcibly releases ALL locks without any ownership validation.
   * Should not be called during normal operation in production environments.
   *
   * @example Test cleanup with beforeEach hook
   * ```typescript
   * import { describe, beforeEach, test } from 'vitest'
   *
   * const lock = new MemoryLock()
   *
   * beforeEach(async () => {
   *   await lock.clear() // Ensure clean state for each test
   * })
   *
   * test('lock acquisition', async () => {
   *   const acquired = await lock.acquire('test-resource', 5000)
   *   expect(acquired).toBe(true)
   * })
   * ```
   *
   * @example Graceful shutdown handler
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down, releasing all locks...')
   *   await lock.clear()
   *   process.exit(0)
   * })
   * ```
   */
  async clear(): Promise<void> {
    this.locks.clear()
  }

  /**
   * Returns the number of lock entries currently stored in memory.
   *
   * **Important:** This includes BOTH active and expired locks. Expired locks
   * are only cleaned up during `acquire()` or `isLocked()` calls, so this count
   * may include stale entries.
   *
   * **Use cases:**
   * - Monitoring memory usage and lock accumulation
   * - Debugging lock leakage issues
   * - Testing lock lifecycle behavior
   * - Detecting abnormal lock retention patterns
   *
   * **Not suitable for:**
   * - Determining number of ACTIVE locks (use `isLocked()` on each resource)
   * - Production health checks (includes expired locks)
   *
   * @returns The total number of lock entries in the internal Map, including expired ones.
   *
   * @example Monitoring lock accumulation
   * ```typescript
   * const lock = new MemoryLock()
   *
   * setInterval(() => {
   *   const count = lock.size()
   *   if (count > 100) {
   *     console.warn(`High lock count detected: ${count}`)
   *     // May indicate lock leakage or missing release() calls
   *   }
   * }, 60000)
   * ```
   *
   * @example Testing lock cleanup behavior
   * ```typescript
   * import { test, expect } from 'vitest'
   *
   * test('expired locks are cleaned up', async () => {
   *   const lock = new MemoryLock()
   *
   *   await lock.acquire('resource', 10)
   *   expect(lock.size()).toBe(1)
   *
   *   await sleep(20) // Wait for expiration
   *   expect(lock.size()).toBe(1) // Still in map (not cleaned yet)
   *
   *   await lock.isLocked('resource') // Triggers cleanup
   *   expect(lock.size()).toBe(0) // Now removed
   * })
   * ```
   */
  size(): number {
    return this.locks.size
  }
}
