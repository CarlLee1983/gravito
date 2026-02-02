/**
 * @fileoverview Lock Provider interface for distributed execution
 *
 * Provides a mechanism for coordinating workflow execution across multiple
 * nodes by ensuring only one node executes a specific workflow instance at a time.
 *
 * @module @gravito/flux/core
 */

/**
 * Represents a distributed lock for a specific resource.
 */
export interface Lock {
  /** The unique identifier for the locked resource. */
  id: string
  /** The owner of the lock (e.g., node identifier). */
  owner: string
  /** Unix timestamp when the lock expires. */
  expiresAt: number
  /** Releases the lock manually. */
  release(): Promise<void>
}

/**
 * Interface for implementing distributed locking mechanisms.
 * Required for Cluster Mode to prevent race conditions in multi-node environments.
 */
export interface LockProvider {
  /**
   * Attempts to acquire a lock for a specific resource.
   *
   * @param resourceId - The unique ID of the resource to lock (e.g., workflowId).
   * @param owner - The identifier of the node/process requesting the lock.
   * @param ttl - Time-to-live for the lock in milliseconds.
   * @returns A Lock object if successful, otherwise null.
   */
  acquire(resourceId: string, owner: string, ttl: number): Promise<Lock | null>

  /**
   * Refreshes an existing lock to extend its lifetime.
   *
   * @param resourceId - The ID of the resource.
   * @param owner - The current owner of the lock.
   * @param ttl - The new time-to-live from the current moment.
   * @returns True if the lock was successfully refreshed.
   */
  refresh(resourceId: string, owner: string, ttl: number): Promise<boolean>

  /**
   * Forcefully releases a lock, regardless of the owner.
   *
   * @param resourceId - The ID of the resource to unlock.
   */
  release(resourceId: string): Promise<void>
}

/**
 * In-memory implementation of LockProvider for local development and testing.
 * Does NOT support multiple processes or nodes.
 */
export class MemoryLockProvider implements LockProvider {
  private locks = new Map<string, { owner: string; expiresAt: number }>()

  async acquire(resourceId: string, owner: string, ttl: number): Promise<Lock | null> {
    const now = Date.now()
    const existing = this.locks.get(resourceId)

    if (existing && existing.expiresAt > now) {
      if (existing.owner === owner) {
        // Same owner, refresh
        existing.expiresAt = now + ttl
        return this.createLock(resourceId, owner, existing.expiresAt)
      }
      return null
    }

    const expiresAt = now + ttl
    this.locks.set(resourceId, { owner, expiresAt })
    return this.createLock(resourceId, owner, expiresAt)
  }

  async refresh(resourceId: string, owner: string, ttl: number): Promise<boolean> {
    const now = Date.now()
    const existing = this.locks.get(resourceId)

    if (existing && existing.owner === owner && existing.expiresAt > now) {
      existing.expiresAt = now + ttl
      return true
    }

    return false
  }

  async release(resourceId: string): Promise<void> {
    this.locks.delete(resourceId)
  }

  private createLock(id: string, owner: string, expiresAt: number): Lock {
    return {
      id,
      owner,
      expiresAt,
      release: () => this.release(id),
    }
  }
}
