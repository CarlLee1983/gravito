import { randomUUID } from 'node:crypto'
import { type CacheLock, LockTimeoutError, sleep } from '../locks'
import type { CacheStore, TaggableStore } from '../store'
import {
  type CacheKey,
  type CacheTtl,
  type CacheValue,
  isExpired,
  normalizeCacheKey,
  ttlToExpiresAt,
} from '../types'
import { LRUCache } from '../utils/LRUCache'

type Entry = {
  value: unknown
  expiresAt: number | null
}

type LockEntry = {
  owner: string
  expiresAt: number
}

/**
 * Options for configuring the `MemoryStore`.
 *
 * @public
 * @since 3.0.0
 */
export type MemoryStoreOptions = {
  /** Maximum number of items to keep in memory. Uses LRU eviction. */
  maxItems?: number
}

/**
 * Statistics for the MemoryStore.
 *
 * @public
 * @since 3.0.0
 */
export type MemoryCacheStats = {
  /** Number of successful cache lookups. */
  hits: number
  /** Number of failed cache lookups. */
  misses: number
  /** The ratio of hits to total lookups (hits / (hits + misses)). */
  hitRate: number
  /** Current number of items in the cache. */
  size: number
  /** Total number of items evicted due to the `maxItems` limit. */
  evictions: number
}

/**
 * MemoryStore implements the `CacheStore` interface using a Map.
 *
 * It provides a fast, non-persistent cache backend with support for
 * TTL expiration, basic tagging, and local locking.
 *
 * @public
 * @since 3.0.0
 */
export class MemoryStore implements CacheStore, TaggableStore {
  private entries: LRUCache<Entry>
  private locks = new Map<string, LockEntry>()
  private stats = { hits: 0, misses: 0, evictions: 0 }

  private tagToKeys = new Map<string, Set<string>>()
  private keyToTags = new Map<string, Set<string>>()

  constructor(private options: MemoryStoreOptions = {}) {
    this.entries = new LRUCache<Entry>(options.maxItems ?? 0, (key) => {
      this.tagIndexRemove(key)
      this.stats.evictions++
    })
  }

  /**
   * Get the current cache statistics.
   */
  getStats(): MemoryCacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.entries.size,
      evictions: this.stats.evictions,
    }
  }

  private cleanupExpired(key: string, now = Date.now()): void {
    const entry = this.entries.peek(key)
    if (!entry) {
      return
    }
    if (isExpired(entry.expiresAt, now)) {
      void this.forget(key)
    }
  }

  async get<T = unknown>(key: CacheKey): Promise<CacheValue<T>> {
    const normalized = normalizeCacheKey(key)
    const entry = this.entries.get(normalized)
    if (!entry) {
      this.stats.misses++
      return null
    }

    if (isExpired(entry.expiresAt)) {
      await this.forget(normalized)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.value as T
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key)
    const expiresAt = ttlToExpiresAt(ttl)
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized)
      return
    }

    this.entries.set(normalized, { value, expiresAt: expiresAt ?? null })
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    this.cleanupExpired(normalized)
    if (this.entries.has(normalized)) {
      return false
    }
    await this.put(normalized, value, ttl)
    return true
  }

  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    const existed = this.entries.delete(normalized)
    this.tagIndexRemove(normalized)
    return existed
  }

  async flush(): Promise<void> {
    this.entries.clear()
    this.tagToKeys.clear()
    this.keyToTags.clear()
  }

  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    const current = await this.get<number>(normalized)
    const next = (current ?? 0) + value
    await this.put(normalized, next, null)
    return next
  }

  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  async ttl(key: CacheKey): Promise<number | null> {
    const normalized = normalizeCacheKey(key)
    const entry = this.entries.peek(normalized)

    if (!entry || entry.expiresAt === null) {
      return null
    }

    const now = Date.now()
    if (isExpired(entry.expiresAt, now)) {
      await this.forget(normalized)
      return null
    }

    return Math.max(0, Math.ceil((entry.expiresAt - now) / 1000))
  }

  lock(name: string, seconds = 10): CacheLock {
    const lockKey = `lock:${normalizeCacheKey(name)}`
    const ttlMillis = Math.max(1, seconds) * 1000
    const locks = this.locks

    const acquire = async (): Promise<{ ok: boolean; owner?: string }> => {
      const now = Date.now()
      const existing = locks.get(lockKey)
      if (existing && existing.expiresAt > now) {
        return { ok: false }
      }

      const owner = randomUUID()
      locks.set(lockKey, { owner, expiresAt: now + ttlMillis })
      return { ok: true, owner }
    }

    let owner: string | undefined

    return {
      async acquire(): Promise<boolean> {
        const result = await acquire()
        if (!result.ok) {
          return false
        }
        owner = result.owner
        return true
      },

      async release(): Promise<void> {
        if (!owner) {
          return
        }
        const existing = locks.get(lockKey)
        if (existing?.owner === owner) {
          locks.delete(lockKey)
        }
        owner = undefined
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

  tagKey(key: string, tags: readonly string[]): string {
    const normalizedKey = normalizeCacheKey(key)
    const normalizedTags = [...tags].map(String).filter(Boolean).sort()
    if (normalizedTags.length === 0) {
      return normalizedKey
    }
    return `tags:${normalizedTags.join('|')}:${normalizedKey}`
  }

  tagIndexAdd(tags: readonly string[], taggedKey: string): void {
    const normalizedTags = [...tags].map(String).filter(Boolean)
    if (normalizedTags.length === 0) {
      return
    }

    for (const tag of normalizedTags) {
      let keys = this.tagToKeys.get(tag)
      if (!keys) {
        keys = new Set<string>()
        this.tagToKeys.set(tag, keys)
      }
      keys.add(taggedKey)
    }

    let tagSet = this.keyToTags.get(taggedKey)
    if (!tagSet) {
      tagSet = new Set<string>()
      this.keyToTags.set(taggedKey, tagSet)
    }
    for (const tag of normalizedTags) {
      tagSet.add(tag)
    }
  }

  tagIndexRemove(taggedKey: string): void {
    const tags = this.keyToTags.get(taggedKey)
    if (!tags) {
      return
    }

    for (const tag of tags) {
      const keys = this.tagToKeys.get(tag)
      if (!keys) {
        continue
      }
      keys.delete(taggedKey)
      if (keys.size === 0) {
        this.tagToKeys.delete(tag)
      }
    }

    this.keyToTags.delete(taggedKey)
  }

  async flushTags(tags: readonly string[]): Promise<void> {
    const normalizedTags = [...tags].map(String).filter(Boolean)
    if (normalizedTags.length === 0) {
      return
    }

    const keysToDelete = new Set<string>()
    for (const tag of normalizedTags) {
      const keys = this.tagToKeys.get(tag)
      if (!keys) {
        continue
      }
      for (const k of keys) {
        keysToDelete.add(k)
      }
    }

    for (const key of keysToDelete) {
      await this.forget(key)
    }
  }
}
