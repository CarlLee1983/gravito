import type { LockStore } from './LockStore'

/**
 * Lightweight, in-memory lock store for local development and single-node deployments.
 *
 * Implements the `LockStore` contract using a local `Map`. It does not support
 * shared state across processes or servers.
 *
 * @example
 * ```typescript
 * const store = new MemoryLockStore();
 * const ok = await store.acquire('local-job', 60);
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class MemoryLockStore implements LockStore {
  /** Map of lock keys to their expiration timestamps (ms). */
  private locks = new Map<string, number>()

  /**
   * Acquires a local lock if the key is not already active.
   *
   * @param key - Lock identifier.
   * @param ttlSeconds - Expiration duration.
   */
  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const NOW = Date.now()
    const expiresAt = this.locks.get(key)

    if (expiresAt && expiresAt > NOW) {
      return false
    }

    this.locks.set(key, NOW + ttlSeconds * 1000)
    return true
  }

  /**
   * Deletes the lock from local memory.
   *
   * @param key - Lock identifier.
   */
  async release(key: string): Promise<void> {
    this.locks.delete(key)
  }

  /**
   * Sets or overwrites a local lock.
   *
   * @param key - Lock identifier.
   * @param ttlSeconds - Expiration.
   */
  async forceAcquire(key: string, ttlSeconds: number): Promise<void> {
    this.locks.set(key, Date.now() + ttlSeconds * 1000)
  }

  /**
   * Checks if a local lock is present and hasn't expired.
   *
   * Automatically purges expired locks upon checking.
   *
   * @param key - Lock identifier.
   */
  async exists(key: string): Promise<boolean> {
    const expiresAt = this.locks.get(key)
    if (!expiresAt) {
      return false
    }

    if (expiresAt <= Date.now()) {
      this.locks.delete(key)
      return false
    }

    return true
  }
}
