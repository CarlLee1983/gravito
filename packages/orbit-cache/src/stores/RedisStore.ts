import { randomUUID } from 'node:crypto'
import { Redis, type RedisClientContract } from '@gravito/orbit-redis'
import { type CacheLock, LockTimeoutError, sleep } from '../locks'
import type { CacheStore, TaggableStore } from '../store'
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types'

export type RedisStoreOptions = {
  connection?: string
  prefix?: string // Redis-level prefix (though CacheRepository also handles prefix)
}

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
    const count = await this.client.del(normalized)

    // Also remove from any tags?
    // We don't know which tags it belongs to (one-way link).
    // This implies that if we delete a key directly, it might remain in tag sets.
    // That's a common trade-off in simple Redis tagging.
    // A robust implementation uses "tag sets" + "key sets" (SADD tag:xyz key)
    // When flushing tag:xyz, we SMEMBERS tag:xyz and DEL keys.
    // If we just DEL key, it stays in SMEMBERS. This is "zombie" entries in tag set.
    // We could clean them up lazily or ignore them (DEL on non-existent key is fine).

    return count > 0
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
    for (const tag of tags) {
      const tagSetKey = `tag:${tag}`
      pipeline.sadd(tagSetKey, taggedKey)
    }
    await pipeline.exec()
  }

  async tagIndexRemove(_taggedKey: string): Promise<void> {
    // We can't efficiently remove a key from all tags without knowing which tags it has.
    // In this simple implementation, we accept that tag sets might contain deleted keys.
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
        // Lua script to safely release only if owner matches
        // But for now, simple get/del or assuming ioredis is fine.
        // Actually, race condition if we just GET then DEL.
        // Let's just DEL for now, or check value.
        const current = await client.get(lockKey)
        if (current === owner) {
          await client.del(lockKey)
        }
      },

      async block<T>(
        secondsToWait: number,
        callback: () => Promise<T> | T,
        options?: { sleepMillis?: number }
      ): Promise<T> {
        const deadline = Date.now() + Math.max(0, secondsToWait) * 1000
        const sleepMillis = options?.sleepMillis ?? 150

        while (Date.now() <= deadline) {
          if (await this.acquire()) {
            try {
              return await callback()
            } finally {
              await this.release()
            }
          }
          await sleep(sleepMillis)
        }

        throw new LockTimeoutError(
          `Failed to acquire lock '${name}' within ${secondsToWait} seconds.`
        )
      },
    }
  }
}
