/**
 * Contract for distributed lock storage backends.
 *
 * Defines the essential operations required to manage mutual exclusion across
 * multiple scheduler instances. Implementations must ensure atomicity for
 * distributed safety.
 *
 * @public
 * @since 3.0.0
 */
export interface LockStore {
  /**
   * Attempts to acquire a mutex lock for a specific key.
   *
   * Must be atomic. If the key is already locked, it should return false
   * immediately without blocking.
   *
   * @param key - The unique lock identifier.
   * @param ttlSeconds - Expiration duration in seconds to prevent deadlocks.
   * @returns True if the lock was successfully acquired.
   */
  acquire(key: string, ttlSeconds: number): Promise<boolean>

  /**
   * Explicitly releases a held lock.
   *
   * Should be idempotent; releasing a non-existent lock should not throw.
   *
   * @param key - The lock identifier to remove.
   */
  release(key: string): Promise<void>

  /**
   * Forcibly acquires or refreshes a lock, overwriting any existing state.
   *
   * @param key - The lock identifier.
   * @param ttlSeconds - New expiration duration.
   */
  forceAcquire(key: string, ttlSeconds: number): Promise<void>

  /**
   * Checks if a lock is currently active and not expired.
   *
   * @param key - The lock identifier.
   * @returns True if the lock exists.
   */
  exists(key: string): Promise<boolean>
}
