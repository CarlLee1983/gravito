/**
 * @fileoverview Redis-based Lock Provider for distributed workflow execution
 *
 * Provides a Redis-backed distributed locking mechanism for coordinating
 * workflow execution across multiple nodes in a cluster.
 *
 * @module @gravito/flux/core
 */

import type { Lock, LockProvider } from './LockProvider'

/**
 * Minimal Redis client interface for compatibility with ioredis/redis libraries.
 * Consumers should provide a client that implements these methods.
 */
export interface RedisClient {
  /**
   * SET command with optional NX and PX options.
   * @param key - The key to set
   * @param value - The value to set
   * @param options - SET options (NX for only-if-not-exists, PX for expiry in ms)
   * @returns 'OK' if set, null if key exists (with NX)
   */
  set(key: string, value: string, options?: { NX?: boolean; PX?: number }): Promise<'OK' | null>

  /**
   * GET command to retrieve a value.
   * @param key - The key to get
   * @returns The value or null if not found
   */
  get(key: string): Promise<string | null>

  /**
   * DEL command to delete a key.
   * @param key - The key to delete
   * @returns Number of keys deleted
   */
  del(key: string): Promise<number>

  /**
   * EVAL command to execute Lua scripts atomically.
   * @param script - The Lua script
   * @param keys - Array of keys
   * @param args - Array of arguments
   * @returns Script result
   */
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>
}

/**
 * Configuration options for RedisLockProvider.
 */
export interface RedisLockProviderOptions {
  /** Redis client instance (must implement RedisClient interface) */
  client: RedisClient
  /** Prefix for all lock keys (default: 'flux:lock:') */
  keyPrefix?: string
  /** Default TTL for locks in milliseconds (default: 30000) */
  defaultTtl?: number
  /** Delay between retry attempts in milliseconds (default: 100) */
  retryDelay?: number
  /** Maximum number of retry attempts (default: 0, no retries) */
  maxRetries?: number
}

/**
 * Lua script for safe lock release.
 * Only releases the lock if the owner matches.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`

/**
 * Lua script for safe lock refresh.
 * Only refreshes the TTL if the owner matches.
 */
const REFRESH_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`

/**
 * Redis-based implementation of LockProvider for distributed locking.
 *
 * Uses Redis SET NX PX for atomic lock acquisition and Lua scripts
 * for safe release and refresh operations.
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { RedisLockProvider } from '@gravito/flux'
 *
 * const redis = new Redis()
 * const lockProvider = new RedisLockProvider({
 *   client: redis,
 *   keyPrefix: 'myapp:locks:',
 *   defaultTtl: 30000,
 * })
 *
 * const lock = await lockProvider.acquire('workflow-123', 'node-1', 30000)
 * if (lock) {
 *   try {
 *     // Do work with the lock
 *   } finally {
 *     await lock.release()
 *   }
 * }
 * ```
 */
export class RedisLockProvider implements LockProvider {
  private readonly client: RedisClient
  private readonly keyPrefix: string
  private readonly defaultTtl: number
  private readonly retryDelay: number
  private readonly maxRetries: number

  constructor(options: RedisLockProviderOptions) {
    this.client = options.client
    this.keyPrefix = options.keyPrefix ?? 'flux:lock:'
    this.defaultTtl = options.defaultTtl ?? 30000
    this.retryDelay = options.retryDelay ?? 100
    this.maxRetries = options.maxRetries ?? 0
  }

  /**
   * Attempts to acquire a lock for a specific resource.
   *
   * Uses Redis SET with NX (only if not exists) and PX (expire in ms)
   * for atomic lock acquisition. Supports retry with configurable delay.
   *
   * @param resourceId - The unique ID of the resource to lock
   * @param owner - The identifier of the node/process requesting the lock
   * @param ttl - Time-to-live for the lock in milliseconds
   * @returns A Lock object if successful, otherwise null
   */
  async acquire(resourceId: string, owner: string, ttl: number): Promise<Lock | null> {
    const key = this.getKey(resourceId)
    const effectiveTtl = ttl || this.defaultTtl

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const result = await this.client.set(key, owner, {
        NX: true,
        PX: effectiveTtl,
      })

      if (result === 'OK') {
        const expiresAt = Date.now() + effectiveTtl
        return this.createLock(resourceId, owner, expiresAt)
      }

      const currentOwner = await this.client.get(key)
      if (currentOwner === owner) {
        const refreshed = await this.refresh(resourceId, owner, effectiveTtl)
        if (refreshed) {
          const expiresAt = Date.now() + effectiveTtl
          return this.createLock(resourceId, owner, expiresAt)
        }
      }

      if (attempt < this.maxRetries) {
        await this.sleep(this.retryDelay)
      }
    }

    return null
  }

  /**
   * Refreshes an existing lock to extend its lifetime.
   *
   * Uses a Lua script to atomically check ownership and extend TTL.
   *
   * @param resourceId - The ID of the resource
   * @param owner - The current owner of the lock
   * @param ttl - The new time-to-live from the current moment
   * @returns True if the lock was successfully refreshed
   */
  async refresh(resourceId: string, owner: string, ttl: number): Promise<boolean> {
    const key = this.getKey(resourceId)
    const effectiveTtl = ttl || this.defaultTtl

    const result = await this.client.eval(REFRESH_LOCK_SCRIPT, [key], [owner, effectiveTtl])

    return result === 1
  }

  /**
   * Forcefully releases a lock, regardless of the owner.
   *
   * @param resourceId - The ID of the resource to unlock
   */
  async release(resourceId: string): Promise<void> {
    const key = this.getKey(resourceId)
    await this.client.del(key)
  }

  /**
   * Safely releases a lock only if owned by the specified owner.
   *
   * Uses a Lua script to atomically check ownership and delete.
   *
   * @param resourceId - The ID of the resource to unlock
   * @param owner - The owner that should release the lock
   * @returns True if the lock was released, false if not owned
   */
  async releaseIfOwned(resourceId: string, owner: string): Promise<boolean> {
    const key = this.getKey(resourceId)
    const result = await this.client.eval(RELEASE_LOCK_SCRIPT, [key], [owner])
    return result === 1
  }

  /**
   * Generates the Redis key for a resource.
   */
  private getKey(resourceId: string): string {
    return `${this.keyPrefix}${resourceId}`
  }

  /**
   * Creates a Lock object with a release method.
   */
  private createLock(id: string, owner: string, expiresAt: number): Lock {
    return {
      id,
      owner,
      expiresAt,
      release: async () => {
        await this.releaseIfOwned(id, owner)
      },
    }
  }

  /**
   * Sleeps for the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
