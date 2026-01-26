import { randomUUID } from 'node:crypto'
import { Redis, type RedisClientContract } from '@gravito/plasma'
import { type CacheLock, LockTimeoutError, sleep } from '../locks'
import type { CacheStore, TaggableStore } from '../store'
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types'

/**
 * Options for configuring the `RedisStore`.
 *
 * @public
 * @since 3.0.0
 */
export type RedisStoreOptions = {
  /** The name of the Redis connection to use. */
  connection?: string
  /** Optional Redis-level prefix for keys. */
  prefix?: string
}

/**
 * RedisStore implements the `CacheStore` interface using Redis.
 *
 * It provides a distributed, persistent cache backend with support for
 * atomic increments/decrements, tagging, and distributed locking.
 *
 * @public
 * @since 3.0.0
 */
export class RedisStore implements CacheStore, TaggableStore {
  private connectionName?: string

  constructor(options: RedisStoreOptions = {}) {
    this.connectionName = options.connection
    // We defer getting the connection until used, or get it now.
    // Since orbit-redis manages connections, we can get it now.
    // However, if orbit-redis isn't configured yet, this might throw if we called it in constructor?
    // Usually orbitCache is initialized after core, and Redis.configure should happen before?
    // Actually, OrbitCache.install happens, then user uses it.
    // We'll access Redis.connection() lazily or in methods to be safe,
    // but typically we can store the instance if it's a singleton manager.
    // For now, let's access via a getter to be safe.
  }

  private get client(): RedisClientContract {
    return Redis.connection(this.connectionName)
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
    const value = await this.client.get(normalized)

    if (value === null) {
      return null
    }

    // Try to parse JSON, if it fails return as string
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key)
    const serialized = JSON.stringify(value)
    const expiresAt = ttlToExpiresAt(ttl)

    // Redis SET options
    const options: { px?: number } = {}

    if (expiresAt) {
      const ttlMs = Math.max(1, expiresAt - Date.now())
      options.px = ttlMs
    }

    await this.client.set(normalized, serialized, options)
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    const serialized = JSON.stringify(value)
    const expiresAt = ttlToExpiresAt(ttl)

    const options: { px?: number; nx: boolean } = { nx: true }

    if (expiresAt) {
      const ttlMs = Math.max(1, expiresAt - Date.now())
      options.px = ttlMs
    }

    const result = await this.client.set(normalized, serialized, options)
    return result === 'OK'
  }

  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key)

    const luaScript = `
      local key = KEYS[1]
      local tag_prefix = ARGV[1]
      local tags = redis.call('SMEMBERS', key .. ':tags')
      local del_result = redis.call('DEL', key)
      for _, tag in ipairs(tags) do
        redis.call('SREM', tag_prefix .. tag, key)
      end
      redis.call('DEL', key .. ':tags')
      return del_result
    `

    const client = this.client as unknown as {
      eval(script: string, numKeys: number, ...args: string[]): Promise<number>
    }

    const result = await client.eval(luaScript, 1, normalized, 'tag:')
    return result > 0
  }

  async flush(): Promise<void> {
    await this.client.flushdb()
  }

  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    if (value === 1) {
      return await this.client.incr(normalized)
    }
    return await this.client.incrby(normalized, value)
  }

  async decrement(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    if (value === 1) {
      return await this.client.decr(normalized)
    }
    return await this.client.decrby(normalized, value)
  }

  // ============================================================================
  // Tags
  // ============================================================================

  tagKey(key: string, _tags: readonly string[]): string {
    // We use the key as-is, so tagging doesn't change the key name.
    // This allows accessing the same key with or without tags.
    return key
  }

  async tagIndexAdd(tags: readonly string[], taggedKey: string): Promise<void> {
    if (tags.length === 0) {
      return
    }

    const pipeline = this.client.pipeline()

    pipeline.sadd(`${taggedKey}:tags`, ...tags)

    for (const tag of tags) {
      const tagSetKey = `tag:${tag}`
      pipeline.sadd(tagSetKey, taggedKey)
    }

    await pipeline.exec()
  }

  async tagIndexRemove(taggedKey: string): Promise<void> {
    const luaScript = `
      local key = KEYS[1]
      local tag_prefix = ARGV[1]
      local tags = redis.call('SMEMBERS', key .. ':tags')
      for _, tag in ipairs(tags) do
        redis.call('SREM', tag_prefix .. tag, key)
      end
      redis.call('DEL', key .. ':tags')
    `

    const client = this.client as unknown as {
      eval(script: string, numKeys: number, ...args: string[]): Promise<number>
    }

    await client.eval(luaScript, 1, taggedKey, 'tag:')
  }

  async flushTags(tags: readonly string[]): Promise<void> {
    if (tags.length === 0) {
      return
    }

    const tagKeys = tags.map((tag) => `tag:${tag}`)

    // Get all keys from all tags
    // We want the UNION of keys? Or just keys in ANY of these tags?
    // Usually flushTags(['a', 'b']) means flush 'a' AND flush 'b'.

    // 1. Get keys
    const pipeline = this.client.pipeline()
    for (const tagKey of tagKeys) {
      pipeline.smembers(tagKey)
    }
    const results = await pipeline.exec()

    const keysToDelete = new Set<string>()

    for (const [err, keys] of results) {
      if (!err && Array.isArray(keys)) {
        for (const k of keys) {
          keysToDelete.add(k as string)
        }
      }
    }

    if (keysToDelete.size > 0) {
      await this.client.del(...Array.from(keysToDelete))
    }

    // 2. Delete the tag sets themselves
    await this.client.del(...tagKeys)
  }

  // ============================================================================
  // Locks
  // ============================================================================

  async ttl(key: CacheKey): Promise<number | null> {
    const normalized = normalizeCacheKey(key)
    const result = await this.client.ttl(normalized)
    return result < 0 ? null : result
  }

  lock(name: string, seconds = 10): CacheLock {
    const lockKey = `lock:${normalizeCacheKey(name)}`
    const owner = randomUUID()
    const ttlMs = Math.max(1, seconds) * 1000

    const client = this.client

    return {
      async acquire(): Promise<boolean> {
        const result = await client.set(lockKey, owner, { nx: true, px: ttlMs })
        return result === 'OK'
      },

      async release(): Promise<void> {
        const luaScript = `
          local current = redis.call('GET', KEYS[1])
          if current == ARGV[1] then
            return redis.call('DEL', KEYS[1])
          else
            return 0
          end
        `

        const evalClient = client as unknown as {
          eval(script: string, numKeys: number, ...args: string[]): Promise<number>
        }

        await evalClient.eval(luaScript, 1, lockKey, owner)
      },

      async extend(extensionSeconds: number): Promise<boolean> {
        const luaScript = `
          local current = redis.call('GET', KEYS[1])
          if current == ARGV[1] then
            return redis.call('EXPIRE', KEYS[1], ARGV[2])
          else
            return 0
          end
        `

        const evalClient = client as unknown as {
          eval(script: string, numKeys: number, ...args: string[]): Promise<number>
        }

        const result = await evalClient.eval(
          luaScript,
          1,
          lockKey,
          owner,
          extensionSeconds.toString()
        )
        return result === 1
      },

      async getRemainingTime(): Promise<number> {
        return await client.ttl(lockKey)
      },

      async block<T>(
        secondsToWait: number,
        callback: () => Promise<T> | T,
        options?: {
          retryInterval?: number
          maxRetries?: number
          signal?: AbortSignal
          sleepMillis?: number
        }
      ): Promise<T> {
        const retryInterval = options?.retryInterval ?? options?.sleepMillis ?? 100
        const maxRetries = options?.maxRetries ?? Number.POSITIVE_INFINITY
        const signal = options?.signal
        const deadline = Date.now() + Math.max(0, secondsToWait) * 1000
        let attempt = 0

        while (Date.now() <= deadline && attempt < maxRetries) {
          if (signal?.aborted) {
            throw new Error(`Lock acquisition for '${name}' was aborted`)
          }

          if (await this.acquire()) {
            try {
              return await callback()
            } finally {
              await this.release()
            }
          }

          attempt++
          const delay = Math.min(retryInterval * 1.5 ** Math.min(attempt, 10), 1000)
          await sleep(delay)
        }

        throw new LockTimeoutError(
          `Failed to acquire lock '${name}' within ${secondsToWait} seconds.`
        )
      },
    }
  }
}
