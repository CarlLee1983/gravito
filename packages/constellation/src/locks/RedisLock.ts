import { randomUUID } from 'node:crypto'
import type { SitemapLock } from '../types'

/**
 * Minimal Redis client interface required for distributed locking operations.
 *
 * Designed to be compatible with popular Redis clients (node-redis, ioredis)
 * while keeping dependencies minimal. Only requires SET NX EX and EVAL commands
 * for atomic lock operations.
 *
 * @public
 * @since 3.1.0
 */
export interface RedisClient {
  /**
   * Atomically sets a key with value only if key doesn't exist (NX) and expires after TTL seconds (EX).
   *
   * This is the core primitive for distributed lock acquisition. The combination of
   * NX (Not eXists) and EX (EXpiration) flags ensures atomicity and auto-release.
   *
   * @param key - Redis key for the lock (e.g., 'sitemap:lock:generation')
   * @param value - Unique lock identifier (UUID) for ownership validation
   * @param mode - Must be 'EX' for expiration in seconds
   * @param ttl - Time-to-live in seconds before auto-release
   * @param flag - Must be 'NX' to set only if not exists
   * @returns 'OK' if lock acquired, null if key already exists
   */
  set(key: string, value: string, mode: 'EX', ttl: number, flag: 'NX'): Promise<string | null>

  /**
   * Executes a Lua script atomically on the Redis server.
   *
   * Used for safe lock release: compares lock owner and deletes in a single atomic operation.
   * This prevents accidentally releasing locks held by other instances.
   *
   * @param script - Lua script source code
   * @param numKeys - Number of Redis keys referenced in the script
   * @param args - Keys and arguments for the script (KEYS[], ARGV[])
   * @returns Script execution result (1 if deleted, 0 if not owner)
   */
  eval(script: string, numKeys: number, ...args: string[]): Promise<number>
}

/**
 * Configuration options for RedisLock distributed locking.
 *
 * @public
 * @since 3.1.0
 */
export interface RedisLockOptions {
  /**
   * Connected Redis client instance.
   *
   * Must be already connected and ready for commands.
   * Supports node-redis, ioredis, or any client implementing RedisClient interface.
   */
  client: RedisClient

  /**
   * Prefix for all lock keys in Redis.
   *
   * Recommended to include namespace and entity type for clarity.
   *
   * @defaultValue 'sitemap:lock:'
   * @example 'myapp:sitemap:lock:'
   */
  keyPrefix?: string

  /**
   * Number of retry attempts if lock acquisition fails.
   *
   * Set to 0 for fail-fast behavior (no retries).
   * Recommended: 3-5 retries for transient contention.
   *
   * @defaultValue 0
   */
  retryCount?: number

  /**
   * Delay in milliseconds between retry attempts.
   *
   * Should be tuned based on expected lock hold time.
   * Too short: wastes CPU, too long: increases latency.
   *
   * @defaultValue 100
   */
  retryDelay?: number
}

/**
 * Redis-based distributed lock for multi-instance sitemap generation.
 *
 * Implements distributed mutual exclusion using Redis atomic operations (SET NX EX)
 * and Lua scripts for safe ownership-validated release. Designed for production
 * environments where multiple instances compete for exclusive access to resources.
 *
 * **When to use:**
 * - Kubernetes or Docker Swarm multi-replica deployments
 * - Horizontally scaled applications (multiple instances/VMs)
 * - Any environment requiring cross-process/cross-machine synchronization
 * - Production systems where cache stampede prevention is critical
 *
 * **When NOT to use:**
 * - Single-instance deployments (use {@link MemoryLock} instead)
 * - Development/testing environments without Redis infrastructure
 * - Scenarios where eventual consistency is acceptable
 *
 * **Design rationale:**
 * - Atomic operations prevent race conditions at Redis level
 * - Unique lock ID (UUID) ensures only owner can release lock
 * - Auto-expiration (TTL) prevents deadlocks from crashed instances
 * - Retry mechanism handles transient contention gracefully
 * - Lua scripts provide atomicity for compare-and-delete operations
 *
 * **Comparison with RedLock:**
 * This implementation uses a single Redis instance. For Redis Cluster deployments,
 * consider implementing the RedLock algorithm (multiple Redis masters) for higher
 * availability. Current implementation trades off some availability for simplicity.
 *
 * @example Basic usage with node-redis
 * ```typescript
 * import { RedisLock } from '@gravito/constellation'
 * import { createClient } from 'redis'
 *
 * const redisClient = createClient({ url: 'redis://localhost:6379' })
 * await redisClient.connect()
 *
 * const lock = new RedisLock({
 *   client: redisClient,
 *   keyPrefix: 'sitemap:lock:',
 *   retryCount: 3,
 *   retryDelay: 100
 * })
 *
 * const acquired = await lock.acquire('sitemap-generation', 60000)
 * if (acquired) {
 *   try {
 *     await generateSitemap()
 *   } finally {
 *     await lock.release('sitemap-generation')
 *   }
 * }
 * ```
 *
 * @example Production deployment with Kubernetes
 * ```typescript
 * // In Kubernetes, multiple pods compete for the lock
 * const lock = new RedisLock({
 *   client: redisClient,
 *   keyPrefix: `${process.env.K8S_NAMESPACE}:sitemap:lock:`,
 *   retryCount: 5,
 *   retryDelay: 200
 * })
 *
 * // Pod 1 acquires lock
 * const acquired = await lock.acquire('generation', 300000)
 * if (!acquired) {
 *   // Pod 2, 3, ... receive 503 and retry later
 *   return new Response('Another pod is generating sitemap', {
 *     status: 503,
 *     headers: { 'Retry-After': '60' }
 *   })
 * }
 * ```
 *
 * @example Handling Redis connection failures
 * ```typescript
 * const lock = new RedisLock({ client: redisClient })
 *
 * try {
 *   const acquired = await lock.acquire('resource', 30000)
 *   // If Redis is down, acquire() returns false (logged internally)
 *   if (!acquired) {
 *     console.log('Lock acquisition failed (may be Redis connection issue)')
 *   }
 * } catch (error) {
 *   // Network errors are caught and logged, not thrown
 *   console.error('Unexpected error:', error)
 * }
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class RedisLock implements SitemapLock {
  /**
   * Unique identifier for this lock instance.
   *
   * Generated once during construction and used for all locks acquired by this instance.
   * Enables ownership validation: only the instance that acquired the lock can release it.
   *
   * **Security consideration:**
   * UUIDs are sufficiently random to prevent lock hijacking across instances.
   * However, they are stored in plain text in Redis (not encrypted).
   */
  private lockId = randomUUID()

  /**
   * Redis key prefix for all locks acquired through this instance.
   *
   * Combined with resource name to form full Redis key (e.g., 'sitemap:lock:generation').
   * Allows namespace isolation and easier debugging in Redis CLI.
   */
  private keyPrefix: string

  /**
   * Maximum number of retry attempts when lock is held by another instance.
   *
   * Set to 0 for fail-fast behavior. Higher values increase acquisition success
   * rate but also increase latency under contention.
   */
  private retryCount: number

  /**
   * Delay in milliseconds between consecutive retry attempts.
   *
   * Should be tuned based on expected lock hold time. Typical values: 50-500ms.
   */
  private retryDelay: number

  /**
   * Constructs a new RedisLock instance with the specified configuration.
   *
   * @param options - Configuration including Redis client and retry parameters.
   *
   * @example With custom retry strategy
   * ```typescript
   * const lock = new RedisLock({
   *   client: redisClient,
   *   keyPrefix: 'app:locks:',
   *   retryCount: 10,    // More retries for high-contention scenarios
   *   retryDelay: 50     // Shorter delay for low-latency requirements
   * })
   * ```
   */
  constructor(private options: RedisLockOptions) {
    this.keyPrefix = options.keyPrefix || 'sitemap:lock:'
    this.retryCount = options.retryCount ?? 0
    this.retryDelay = options.retryDelay ?? 100
  }

  /**
   * Attempts to acquire a distributed lock using Redis SET NX EX command.
   *
   * Uses atomic Redis operations to ensure only one instance across your entire
   * infrastructure can hold the lock at any given time. Implements retry logic
   * with exponential backoff for handling transient contention.
   *
   * **Algorithm:**
   * 1. Convert TTL from milliseconds to seconds (Redis requirement)
   * 2. Attempt Redis SET key lockId EX ttl NX (atomic operation)
   * 3. If successful (returns 'OK'), lock acquired
   * 4. If failed (returns null), retry up to retryCount times with retryDelay
   * 5. Return true if acquired, false if all attempts exhausted
   *
   * **Atomicity guarantee:**
   * The combination of NX (set if Not eXists) and EX (set EXpiration) in a single
   * Redis command ensures no race conditions. Either the lock is acquired or it isn't.
   *
   * **Error handling:**
   * Redis connection errors are caught, logged to console, and treated as acquisition
   * failure (returns false). This fail-safe behavior prevents exceptions from bubbling
   * up to application code.
   *
   * **Performance:**
   * - Single instance: O(1) Redis operation
   * - With retry: O(retryCount) worst case
   * - Network latency: ~1-5ms per attempt (depends on Redis location)
   *
   * @param resource - Unique identifier for the resource to lock.
   *                   Combined with keyPrefix to form Redis key.
   * @param ttl - Time-to-live in milliseconds. Lock auto-expires after this duration.
   *              Recommended: 2-5x expected operation time to handle slowdowns.
   *              Minimum: 1000ms (1 second) for practical use.
   * @returns Promise resolving to `true` if lock acquired, `false` if held by another instance
   *          or Redis connection failed.
   *
   * @example Basic acquisition in distributed environment
   * ```typescript
   * const lock = new RedisLock({ client: redisClient })
   * const acquired = await lock.acquire('sitemap-generation', 60000)
   *
   * if (!acquired) {
   *   // Another instance (e.g., different Kubernetes pod) holds the lock
   *   console.log('Sitemap generation in progress on another instance')
   *   return new Response('Service busy', {
   *     status: 503,
   *     headers: { 'Retry-After': '30' }
   *   })
   * }
   *
   * try {
   *   await generateSitemap()
   * } finally {
   *   await lock.release('sitemap-generation')
   * }
   * ```
   *
   * @example With retry logic for transient contention
   * ```typescript
   * const lock = new RedisLock({
   *   client: redisClient,
   *   retryCount: 5,
   *   retryDelay: 200
   * })
   *
   * // Will retry 5 times with 200ms delay between attempts
   * const acquired = await lock.acquire('data-import', 120000)
   * ```
   *
   * @example Setting appropriate TTL
   * ```typescript
   * // Fast operation: short TTL
   * await lock.acquire('cache-rebuild', 10000) // 10 seconds
   *
   * // Slow operation: longer TTL with buffer
   * await lock.acquire('full-sitemap', 300000) // 5 minutes
   *
   * // Very slow operation: generous TTL
   * await lock.acquire('data-migration', 1800000) // 30 minutes
   * ```
   */
  async acquire(resource: string, ttl: number): Promise<boolean> {
    const key = this.keyPrefix + resource
    const ttlSeconds = Math.ceil(ttl / 1000)
    let attempts = 0

    while (attempts <= this.retryCount) {
      try {
        const result = await this.options.client.set(key, this.lockId, 'EX', ttlSeconds, 'NX')

        if (result === 'OK') {
          return true
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(`[RedisLock] Failed to acquire lock for ${resource}:`, err.message)
      }

      attempts++
      if (attempts <= this.retryCount) {
        await this.sleep(this.retryDelay)
      }
    }

    return false
  }

  /**
   * Releases the distributed lock using Lua script for atomic ownership validation.
   *
   * Uses a Lua script to atomically check if the current instance owns the lock
   * (by comparing lockId) and delete it if so. This prevents accidentally releasing
   * locks held by other instances, which could cause data corruption in distributed systems.
   *
   * **Lua script logic:**
   * ```lua
   * if redis.call("get", KEYS[1]) == ARGV[1] then
   *   return redis.call("del", KEYS[1])  -- Delete only if owner matches
   * else
   *   return 0  -- Not owner or lock expired, do nothing
   * end
   * ```
   *
   * **Why Lua scripts?**
   * - Atomicity: GET + comparison + DEL execute as one atomic operation
   * - Prevents race conditions: Lock cannot change between check and delete
   * - Server-side execution: No network round trips between steps
   *
   * **Error handling:**
   * Errors during release (e.g., Redis connection loss) are logged but do NOT throw.
   * This is intentional: if instance crashed or TTL expired, lock is already released.
   * Silent failure here prevents cascading errors in finally blocks.
   *
   * **Idempotency:**
   * Safe to call multiple times. Releasing an already-released or expired lock is a no-op.
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
   * const acquired = await lock.acquire('data-processing', 120000)
   * if (!acquired) {
   *   throw new Error('Could not acquire lock')
   * }
   *
   * try {
   *   await processData()
   * } catch (error) {
   *   console.error('Processing failed:', error)
   *   // Lock still released in finally block
   *   throw error
   * } finally {
   *   await lock.release('data-processing')
   * }
   * ```
   *
   * @example Why ownership validation matters
   * ```typescript
   * // Instance A acquires lock with 10-second TTL
   * const lockA = new RedisLock({ client: redisClientA })
   * await lockA.acquire('task', 10000)
   *
   * // ... 11 seconds pass, lock auto-expires ...
   *
   * // Instance B acquires the now-expired lock
   * const lockB = new RedisLock({ client: redisClientB })
   * await lockB.acquire('task', 10000)
   *
   * // Instance A tries to release (after slowdown/GC pause)
   * await lockA.release('task')
   * // ✅ Lua script detects lockId mismatch, does NOT delete B's lock
   * // ❌ Without Lua: Would delete B's lock, causing data corruption
   * ```
   */
  async release(resource: string): Promise<void> {
    const key = this.keyPrefix + resource

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `

      await this.options.client.eval(script, 1, key, this.lockId)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`[RedisLock] Failed to release lock for ${resource}:`, err.message)
    }
  }

  /**
   * Internal utility for sleeping between retry attempts.
   *
   * @param ms - Duration to sleep in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
