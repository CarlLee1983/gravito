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
 * Configuration options for the `MemoryStore`.
 *
 * Used to define the behavior of the in-memory cache, such as eviction policies.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const options: MemoryStoreOptions = { maxItems: 500 };
 * ```
 */
export type MemoryStoreOptions = {
  /**
   * Maximum number of items to keep in memory.
   *
   * When the limit is reached, the Least Recently Used (LRU) item is evicted.
   * Set to 0 or undefined for unlimited capacity (not recommended for production).
   */
  maxItems?: number
}

/**
 * Performance and usage statistics for the `MemoryStore`.
 *
 * Provides insights into cache efficiency and capacity management.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const stats: MemoryCacheStats = {
 *   hits: 100,
 *   misses: 20,
 *   hitRate: 0.83,
 *   size: 500,
 *   evictions: 5
 * };
 * ```
 */
export type MemoryCacheStats = {
  /** Total number of successful cache lookups. */
  hits: number
  /** Total number of failed cache lookups (key not found or expired). */
  misses: number
  /**
   * The efficiency ratio of the cache.
   *
   * Calculated as hits / (hits + misses). Ranges from 0.0 to 1.0.
   */
  hitRate: number
  /** Current number of active items stored in the cache. */
  size: number
  /** Total number of items removed to make room for new entries. */
  evictions: number
}

/**
 * Fast, non-persistent in-memory cache implementation.
 *
 * `MemoryStore` provides a high-performance backend for the `CacheStore` interface.
 * It supports TTL-based expiration, LRU eviction, basic tagging for bulk invalidation,
 * and local mutex locking for atomic operations.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const store = new MemoryStore({ maxItems: 1000 });
 * await store.put('user:1', { name: 'Alice' }, 3600);
 * const user = await store.get('user:1');
 * ```
 */
export class MemoryStore implements CacheStore, TaggableStore {
  private entries: LRUCache<Entry>
  private locks = new Map<string, LockEntry>()
  private stats = { hits: 0, misses: 0, evictions: 0 }

  private tagToKeys = new Map<string, Set<string>>()
  private keyToTags = new Map<string, Set<string>>()

  /**
   * Creates a new MemoryStore instance.
   *
   * @param options - Configuration for capacity and eviction.
   */
  constructor(options: MemoryStoreOptions = {}) {
    this.entries = new LRUCache<Entry>(options.maxItems ?? 0, (key) => {
      this.tagIndexRemove(key)
      this.stats.evictions++
    })
  }

  /**
   * Retrieves current performance metrics.
   *
   * @returns A snapshot of hits, misses, size, and eviction counts.
   *
   * @example
   * ```typescript
   * const stats = store.getStats();
   * console.log(`Cache hit rate: ${stats.hitRate * 100}%`);
   * ```
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

  /**
   * Retrieves an item from the cache by its key.
   *
   * If the item is expired, it will be automatically removed and `null` will be returned.
   *
   * @param key - The unique identifier for the cached item.
   * @returns The cached value, or `null` if not found or expired.
   *
   * @example
   * ```typescript
   * const value = await store.get('my-key');
   * ```
   */
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

  /**
   * Stores an item in the cache with a specific TTL.
   *
   * If the key already exists, it will be overwritten.
   *
   * @param key - The unique identifier for the item.
   * @param value - The data to store.
   * @param ttl - Time-to-live in seconds, or a Date object for absolute expiration.
   *
   * @example
   * ```typescript
   * await store.put('settings', { theme: 'dark' }, 3600);
   * ```
   */
  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const normalized = normalizeCacheKey(key)
    const expiresAt = ttlToExpiresAt(ttl)
    if (expiresAt !== null && expiresAt !== undefined && expiresAt <= Date.now()) {
      await this.forget(normalized)
      return
    }

    this.entries.set(normalized, { value, expiresAt: expiresAt ?? null })
  }

  /**
   * Stores an item only if it does not already exist in the cache.
   *
   * @param key - The unique identifier for the item.
   * @param value - The data to store.
   * @param ttl - Time-to-live in seconds or absolute expiration.
   * @returns `true` if the item was added, `false` if it already existed.
   *
   * @example
   * ```typescript
   * const added = await store.add('unique-task', data, 60);
   * ```
   */
  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    this.cleanupExpired(normalized)
    if (this.entries.has(normalized)) {
      return false
    }
    await this.put(normalized, value, ttl)
    return true
  }

  /**
   * Removes an item from the cache.
   *
   * @param key - The unique identifier for the item to remove.
   * @returns `true` if the item existed and was removed, `false` otherwise.
   *
   * @example
   * ```typescript
   * await store.forget('user:session');
   * ```
   */
  async forget(key: CacheKey): Promise<boolean> {
    const normalized = normalizeCacheKey(key)
    const existed = this.entries.delete(normalized)
    this.tagIndexRemove(normalized)
    return existed
  }

  /**
   * Removes all items from the cache and resets all internal indexes.
   *
   * @example
   * ```typescript
   * await store.flush();
   * ```
   */
  async flush(): Promise<void> {
    this.entries.clear()
    this.tagToKeys.clear()
    this.keyToTags.clear()
  }

  /**
   * Increments the value of an item in the cache.
   *
   * If the key does not exist, it starts from 0.
   *
   * @param key - The identifier for the numeric value.
   * @param value - The amount to increment by (defaults to 1).
   * @returns The new incremented value.
   *
   * @example
   * ```typescript
   * const count = await store.increment('page_views');
   * ```
   */
  async increment(key: CacheKey, value = 1): Promise<number> {
    const normalized = normalizeCacheKey(key)
    const current = await this.get<number>(normalized)
    const next = (current ?? 0) + value
    await this.put(normalized, next, null)
    return next
  }

  /**
   * Decrements the value of an item in the cache.
   *
   * @param key - The identifier for the numeric value.
   * @param value - The amount to decrement by (defaults to 1).
   * @returns The new decremented value.
   *
   * @example
   * ```typescript
   * const remaining = await store.decrement('stock_count', 5);
   * ```
   */
  async decrement(key: CacheKey, value = 1): Promise<number> {
    return this.increment(key, -value)
  }

  /**
   * Gets the remaining time-to-live for a cached item.
   *
   * @param key - The identifier for the cached item.
   * @returns Remaining seconds, or `null` if the item has no expiration or does not exist.
   *
   * @example
   * ```typescript
   * const secondsLeft = await store.ttl('token');
   * ```
   */
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

  /**
   * Creates a lock instance for managing exclusive access to a resource.
   *
   * @param name - The name of the lock.
   * @param seconds - The duration the lock should be held (defaults to 10).
   * @returns A `CacheLock` instance.
   *
   * @example
   * ```typescript
   * const lock = store.lock('process-report', 30);
   * if (await lock.acquire()) {
   *   try {
   *     // Critical section
   *   } finally {
   *     await lock.release();
   *   }
   * }
   * ```
   */
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
      /**
       * Attempts to acquire the lock.
       *
       * @returns `true` if acquired, `false` if already held by another process.
       */
      async acquire(): Promise<boolean> {
        const result = await acquire()
        if (!result.ok) {
          return false
        }
        owner = result.owner
        return true
      },

      /**
       * Releases the lock if it is held by the current owner.
       */
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

      /**
       * Attempts to acquire the lock and execute a callback, waiting if necessary.
       *
       * @param secondsToWait - How long to wait for the lock before timing out.
       * @param callback - The logic to execute while holding the lock.
       * @param options - Polling configuration.
       * @returns The result of the callback.
       * @throws {LockTimeoutError} If the lock cannot be acquired within the wait time.
       *
       * @example
       * ```typescript
       * await lock.block(5, async () => {
       *   // This code runs exclusively
       * });
       * ```
       */
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

  /**
   * Generates a tagged key for storage.
   *
   * Used internally to prefix keys with their associated tags.
   *
   * @param key - The original cache key.
   * @param tags - List of tags to associate with the key.
   * @returns A formatted string containing tags and the key.
   */
  tagKey(key: string, tags: readonly string[]): string {
    const normalizedKey = normalizeCacheKey(key)
    const normalizedTags = [...tags].map(String).filter(Boolean).sort()
    if (normalizedTags.length === 0) {
      return normalizedKey
    }
    return `tags:${normalizedTags.join('|')}:${normalizedKey}`
  }

  /**
   * Indexes a tagged key for bulk invalidation.
   *
   * @param tags - The tags to index.
   * @param taggedKey - The full key (including tag prefix) to store.
   */
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

  /**
   * Removes a key from the tag indexes.
   *
   * @param taggedKey - The key to remove from all tag sets.
   */
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

  /**
   * Invalidates all cache entries associated with any of the given tags.
   *
   * @param tags - The tags to flush.
   *
   * @example
   * ```typescript
   * await store.flushTags(['users', 'profiles']);
   * ```
   */
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
