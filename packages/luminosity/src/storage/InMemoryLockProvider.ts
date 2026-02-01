import type { CacheLock, CacheLockProvider } from './adapter'

/**
 * In-memory implementation of CacheLock.
 *
 * Uses process-level locking with a queue mechanism.
 * Only suitable for single-instance deployments.
 *
 * @public
 * @since 3.1.0
 */
class InMemoryLock implements CacheLock {
  private locked = false
  private queue: Array<() => void> = []

  constructor(
    private key: string,
    private ttl: number
  ) {}

  /**
   * Attempt to acquire the lock and execute the function.
   *
   * @param timeout - Maximum time to wait for lock (seconds).
   * @param fn - The function to execute.
   * @returns The result of the function.
   * @throws {Error} If lock acquisition times out.
   */
  async block<T>(timeout: number, fn: () => Promise<T>): Promise<T> {
    // Wait for lock acquisition
    await this.acquire(timeout)

    try {
      // Execute the function
      return await fn()
    } finally {
      // Always release the lock
      this.release()
    }
  }

  private async acquire(timeoutSeconds: number): Promise<void> {
    if (!this.locked) {
      this.locked = true
      return
    }

    // Wait in queue with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove from queue
        const index = this.queue.indexOf(resolve)
        if (index > -1) {
          this.queue.splice(index, 1)
        }
        reject(new Error(`Lock acquisition timeout for key: ${this.key}`))
      }, timeoutSeconds * 1000)

      this.queue.push(() => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  private release(): void {
    const next = this.queue.shift()
    if (next) {
      // Pass lock to next in queue
      next()
    } else {
      this.locked = false
    }
  }
}

/**
 * In-memory lock provider for single-instance deployments.
 *
 * Creates locks that are only valid within the current process.
 * Not suitable for multi-instance or distributed environments.
 *
 * @public
 * @since 3.1.0
 */
export class InMemoryLockProvider implements CacheLockProvider {
  private locks = new Map<string, InMemoryLock>()

  /**
   * Create or retrieve a lock for the given key.
   *
   * @param key - The lock key.
   * @param ttl - Lock time-to-live (not used in memory implementation).
   * @returns A lock instance.
   */
  createLock(key: string, ttl: number): CacheLock {
    let lock = this.locks.get(key)
    if (!lock) {
      lock = new InMemoryLock(key, ttl)
      this.locks.set(key, lock)
    }
    return lock
  }
}
