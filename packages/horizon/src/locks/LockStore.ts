/**
 * Interface for distributed lock storage backends.
 *
 * Provides methods for acquiring, releasing, and managing
 * distributed locks to prevent concurrent task execution.
 *
 * @public
 * @since 3.0.0
 */
export interface LockStore {
  /**
   * Attempt to acquire a lock
   * @param key The lock key
   * @param ttlSeconds Time to live in seconds
   * @returns true if lock acquired, false if lock already exists
   */
  acquire(key: string, ttlSeconds: number): Promise<boolean>

  /**
   * Release a lock
   * @param key The lock key
   */
  release(key: string): Promise<void>

  /**
   * Force acquire a lock (overwrite existing)
   * @param key The lock key
   * @param ttlSeconds Time to live in seconds
   */
  forceAcquire(key: string, ttlSeconds: number): Promise<void>

  /**
   * Check if a lock exists
   * @param key The lock key
   */
  exists(key: string): Promise<boolean>
}
