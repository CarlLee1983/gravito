import { randomUUID } from 'node:crypto'
import type { SitemapLock } from '../types'

export interface RedisClient {
  set(key: string, value: string, mode: 'EX', ttl: number, flag: 'NX'): Promise<string | null>
  eval(script: string, numKeys: number, ...args: string[]): Promise<number>
}

export interface RedisLockOptions {
  client: RedisClient
  keyPrefix?: string
  retryCount?: number
  retryDelay?: number
}

/**
 * Redis-based distributed lock implementation for multi-instance deployments.
 *
 * **Use this lock in distributed environments** (e.g., Kubernetes, multi-instance deployments)
 * to prevent "cache stampede" when multiple instances attempt to generate the sitemap simultaneously.
 *
 * RedisLock uses atomic Redis operations (SET NX EX) for lock acquisition and Lua scripts
 * for safe release, ensuring only the lock owner can release it.
 *
 * @example
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
 * @public
 * @since 3.1.0
 */
export class RedisLock implements SitemapLock {
  private lockId = randomUUID()
  private keyPrefix: string
  private retryCount: number
  private retryDelay: number

  constructor(private options: RedisLockOptions) {
    this.keyPrefix = options.keyPrefix || 'sitemap:lock:'
    this.retryCount = options.retryCount ?? 0
    this.retryDelay = options.retryDelay ?? 100
  }

  /**
   * Attempts to acquire a distributed lock using Redis SET NX EX.
   *
   * Uses atomic operations to ensure only one instance can hold the lock at a time.
   * If the lock is already held, it will retry according to `retryCount` and `retryDelay`.
   *
   * @param resource - Unique identifier for the resource to lock.
   * @param ttl - Time-to-live for the lock in milliseconds.
   * @returns A promise resolving to `true` if the lock was acquired, `false` otherwise.
   *
   * @example
   * ```typescript
   * const acquired = await lock.acquire('sitemap-generation', 60000)
   * if (!acquired) {
   *   console.log('Another instance is generating the sitemap')
   *   return new Response('Generating...', { status: 503, headers: { 'Retry-After': '5' } })
   * }
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
   * Releases the lock for the specified resource.
   *
   * Uses a Lua script to ensure atomicity: the lock is deleted ONLY if the value matches
   * this instance's unique lock ID. This prevents accidentally releasing locks held by others.
   *
   * @param resource - The resource identifier to unlock.
   *
   * @example
   * ```typescript
   * await lock.release('sitemap-generation')
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
