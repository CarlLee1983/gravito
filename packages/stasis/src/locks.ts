/**
 * Error thrown when a lock cannot be acquired within the specified timeout.
 *
 * This error indicates that the maximum waiting time for a distributed lock
 * has been exceeded without successfully gaining ownership.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * try {
 *   await cache.lock('resource', 10).block(5, async () => {
 *     // ...
 *   });
 * } catch (error) {
 *   if (error instanceof LockTimeoutError) {
 *     console.error('Failed to acquire lock within 5 seconds');
 *   }
 * }
 * ```
 */
export class LockTimeoutError extends Error {
  override name = 'LockTimeoutError'
}

/**
 * Interface for a cache-backed distributed lock.
 *
 * A distributed lock ensures mutual exclusion across multiple processes or
 * instances by using a shared cache as the synchronization primitive.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheLock {
  /**
   * Attempt to acquire the lock immediately.
   *
   * Uses an atomic "set if not exists" operation in the underlying cache
   * to ensure only one owner can hold the lock at a time.
   *
   * @returns `true` if the lock was successfully acquired, `false` if it is already held.
   * @throws {Error} If the underlying cache store fails.
   *
   * @example
   * ```typescript
   * const acquired = await lock.acquire();
   * if (acquired) {
   *   try {
   *     // Critical section
   *   } finally {
   *     await lock.release();
   *   }
   * }
   * ```
   */
  acquire(): Promise<boolean>

  /**
   * Release the lock.
   *
   * Removes the lock entry from the cache, allowing other processes to acquire it.
   * Should typically be called in a `finally` block to ensure the lock is not leaked.
   *
   * @returns A promise that resolves when the lock is released.
   * @throws {Error} If the underlying cache store fails.
   *
   * @example
   * ```typescript
   * await lock.release();
   * ```
   */
  release(): Promise<void>

  /**
   * Extend the lock's time-to-live (TTL).
   *
   * Increases the expiration time of the lock to prevent it from being
   * automatically released while a long-running task is still in progress.
   *
   * @param seconds - Duration in seconds to add to the current TTL.
   * @returns `true` if the lock was extended (still owned by this process), `false` otherwise.
   * @throws {Error} If the underlying cache store fails.
   *
   * @example
   * ```typescript
   * const extended = await lock.extend(30);
   * if (!extended) {
   *   throw new Error('Lock lost or expired before extension');
   * }
   * ```
   */
  extend?(seconds: number): Promise<boolean>

  /**
   * Get the remaining time-to-live for the lock.
   *
   * Useful for monitoring or determining if a lock extension is necessary.
   *
   * @returns Remaining TTL in seconds. Returns -1 if the lock doesn't exist, or -2 if it has no TTL.
   * @throws {Error} If the underlying cache store fails.
   *
   * @example
   * ```typescript
   * const ttl = await lock.getRemainingTime();
   * if (ttl > 0 && ttl < 5) {
   *   await lock.extend(10);
   * }
   * ```
   */
  getRemainingTime?(): Promise<number>

  /**
   * Attempt to acquire the lock and execute a callback with automatic retry.
   *
   * If the lock is currently held, this method will poll the cache at regular
   * intervals until the lock is acquired or the timeout is reached.
   *
   * @param seconds - Maximum duration to wait for the lock in seconds.
   * @param callback - Logic to execute once the lock is successfully acquired.
   * @param options - Configuration for polling and retry behavior.
   * @returns The value returned by the callback.
   * @throws {LockTimeoutError} If the lock cannot be acquired within the specified timeout.
   * @throws {Error} If the callback throws or the cache store fails.
   *
   * @example
   * ```typescript
   * const result = await lock.block(10, async () => {
   *   return await performAtomicOperation();
   * });
   * ```
   */
  block<T>(seconds: number, callback: () => Promise<T> | T, options?: BlockOptions): Promise<T>
}

/**
 * Configuration for the `block()` method's retry logic.
 *
 * Defines how the lock acquisition should behave when the lock is already held,
 * including polling intervals and cancellation support.
 *
 * @public
 * @since 3.1.0
 */
export interface BlockOptions {
  /**
   * Delay between consecutive acquisition attempts.
   * @default 100
   */
  retryInterval?: number

  /**
   * Maximum number of times to attempt acquisition before failing.
   * @default Infinity
   */
  maxRetries?: number

  /**
   * Signal to allow external cancellation of the waiting process.
   *
   * @example
   * ```typescript
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 2000);
   * await lock.block(10, task, { signal: controller.signal });
   * ```
   */
  signal?: AbortSignal

  /**
   * @deprecated Use `retryInterval` instead.
   */
  sleepMillis?: number
}

/**
 * Pause execution for a specified duration.
 *
 * Internal utility used for implementing polling delays in lock acquisition.
 *
 * @param ms - Duration to pause in milliseconds.
 * @returns A promise that resolves after the delay.
 * @internal
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
