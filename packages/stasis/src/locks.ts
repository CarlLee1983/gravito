/**
 * Error thrown when a lock cannot be acquired within the specified timeout.
 *
 * @public
 * @since 3.0.0
 */
export class LockTimeoutError extends Error {
  override name = 'LockTimeoutError'
}

/**
 * Interface for a cache-backed distributed lock.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheLock {
  /**
   * Attempt to acquire the lock.
   *
   * @returns `true` if acquired, `false` otherwise.
   */
  acquire(): Promise<boolean>

  /**
   * Release the lock.
   */
  release(): Promise<void>

  /**
   * Extend the lock's TTL by the specified number of seconds.
   *
   * @param seconds - Number of seconds to extend the lock.
   * @returns `true` if the lock was extended (still owned by this owner), `false` otherwise.
   */
  extend?(seconds: number): Promise<boolean>

  /**
   * Get the remaining time-to-live for the lock in seconds.
   *
   * @returns The remaining TTL in seconds, or -1 if the lock doesn't exist, -2 if it has no TTL.
   */
  getRemainingTime?(): Promise<number>

  /**
   * Attempt to acquire the lock and execute a callback.
   * If the lock is held by someone else, it will wait (poll) until the timeout.
   *
   * @param seconds - Maximum time to wait for the lock in seconds.
   * @param callback - Function to execute once the lock is acquired.
   * @param options - Polling options.
   * @returns The result of the callback.
   * @throws {LockTimeoutError} If the lock could not be acquired within the timeout.
   */
  block<T>(seconds: number, callback: () => Promise<T> | T, options?: BlockOptions): Promise<T>
}

/**
 * Options for the block() method.
 *
 * @public
 * @since 3.1.0
 */
export interface BlockOptions {
  /**
   * Milliseconds to wait between retry attempts.
   * @default 100
   */
  retryInterval?: number

  /**
   * Maximum number of retry attempts before giving up.
   * @default Infinity
   */
  maxRetries?: number

  /**
   * AbortSignal to cancel the lock acquisition attempt.
   */
  signal?: AbortSignal

  /**
   * @deprecated Use retryInterval instead.
   */
  sleepMillis?: number
}

/**
 * Pause execution for a specified number of milliseconds.
 *
 * @param ms - Milliseconds to sleep.
 * @internal
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
