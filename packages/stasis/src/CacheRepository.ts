import { type CacheLock, LockTimeoutError, sleep } from './locks'
import type { CacheStore } from './store'
import { isTaggableStore } from './store'
import { type CacheKey, type CacheTtl, normalizeCacheKey } from './types'

/**
 * Supported modes for emitting cache events.
 *
 * Defines how lifecycle hooks (hit, miss, write, etc.) are dispatched to handlers.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEventMode = 'sync' | 'async' | 'off'

/**
 * Event handlers for cache lifecycle events.
 *
 * Provides a contract for reacting to cache operations, enabling logging,
 * monitoring, or custom side effects.
 *
 * @public
 * @since 3.0.0
 */
export type CacheEvents = {
  /** Triggered on a cache hit. */
  hit?: (key: string) => void | Promise<void>
  /** Triggered on a cache miss. */
  miss?: (key: string) => void | Promise<void>
  /** Triggered when a value is written to the cache. */
  write?: (key: string) => void | Promise<void>
  /** Triggered when a value is removed from the cache. */
  forget?: (key: string) => void | Promise<void>
  /** Triggered when the entire cache is flushed. */
  flush?: () => void | Promise<void>
}

/**
 * Options for configuring the `CacheRepository`.
 *
 * Controls behavior such as key prefixing, event emission, and background
 * refresh strategies for flexible caching.
 *
 * @public
 * @since 3.0.0
 */
export type CacheRepositoryOptions = {
  /** Optional prefix for all cache keys. */
  prefix?: string
  /** Default time-to-live for cache entries. */
  defaultTtl?: CacheTtl
  /** Event handlers for cache operations. */
  events?: CacheEvents
  /** Mode for emitting events (sync, async, or off). @default 'async' */
  eventsMode?: CacheEventMode
  /** Whether to throw an error if an event handler fails. @default false */
  throwOnEventError?: boolean
  /** Callback triggered when an event handler encounters an error. */
  onEventError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void
  /** Timeout for background flexible refresh in milliseconds. @default 30000 */
  refreshTimeout?: number
  /**
   * Maximum number of retries for the background flexible refresh callback.
   * @default 0
   */
  maxRetries?: number
  /**
   * Delay between retries for flexible refresh in milliseconds.
   * @default 50
   */
  retryDelay?: number
}

/**
 * Statistics for flexible cache operations.
 *
 * Tracks the performance and reliability of background refresh operations
 * used in stale-while-revalidate patterns.
 *
 * @public
 * @since 3.0.0
 */
export type FlexibleStats = {
  /** Total number of successful background refreshes. */
  refreshCount: number
  /** Total number of background refresh failures (after all retries). */
  refreshFailures: number
  /** Average time taken for a successful refresh in milliseconds. */
  avgRefreshTime: number
}

/**
 * High-level API for cache operations.
 *
 * Wraps a low-level `CacheStore` to provide developer-friendly features like
 * key prefixing, event emission, and advanced patterns like `remember` and `flexible`.
 *
 * @example
 * ```typescript
 * const cache = new CacheRepository(redisStore, { prefix: 'app:' });
 * const user = await cache.remember('user:1', 3600, () => fetchUser(1));
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class CacheRepository {
  private refreshSemaphore = new Map<string, Promise<void>>()
  private flexibleStats = { refreshCount: 0, refreshFailures: 0, totalTime: 0 }

  constructor(
    protected readonly store: CacheStore,
    protected readonly options: CacheRepositoryOptions = {}
  ) {}

  /**
   * Retrieve statistics about flexible cache operations.
   *
   * Useful for monitoring the health and performance of background refreshes.
   *
   * @returns Current statistics for background refresh operations.
   *
   * @example
   * ```typescript
   * const stats = cache.getFlexibleStats();
   * console.log(`Refreshed ${stats.refreshCount} times`);
   * ```
   */
  getFlexibleStats(): FlexibleStats {
    return {
      refreshCount: this.flexibleStats.refreshCount,
      refreshFailures: this.flexibleStats.refreshFailures,
      avgRefreshTime:
        this.flexibleStats.refreshCount > 0
          ? this.flexibleStats.totalTime / this.flexibleStats.refreshCount
          : 0,
    }
  }

  private emit(event: keyof CacheEvents, payload: { key?: string } = {}): void | Promise<void> {
    const mode = this.options.eventsMode ?? 'async'
    if (mode === 'off') {
      return
    }

    const fn = this.options.events?.[event]
    if (!fn) {
      return
    }

    const invoke = (): void | Promise<void> => {
      if (event === 'flush') {
        return (fn as NonNullable<CacheEvents['flush']>)()
      }
      const key = payload.key ?? ''
      return (
        fn as NonNullable<
          CacheEvents['hit'] | CacheEvents['miss'] | CacheEvents['write'] | CacheEvents['forget']
        >
      )(key)
    }

    const reportError = (error: unknown): void => {
      try {
        this.options.onEventError?.(error, event, payload)
      } catch {
        // ignore to keep cache ops safe
      }
    }

    if (mode === 'sync') {
      try {
        return Promise.resolve(invoke()).catch((error) => {
          reportError(error)
          if (this.options.throwOnEventError) {
            throw error
          }
        })
      } catch (error) {
        reportError(error)
        if (this.options.throwOnEventError) {
          throw error
        }
      }
      return
    }

    queueMicrotask(() => {
      try {
        const result = invoke()
        if (result && typeof (result as Promise<void>).catch === 'function') {
          void (result as Promise<void>).catch(reportError)
        }
      } catch (error) {
        reportError(error)
      }
    })
  }

  protected key(key: CacheKey): string {
    const normalized = normalizeCacheKey(key)
    const prefix = this.options.prefix ?? ''
    return prefix ? `${prefix}${normalized}` : normalized
  }

  protected flexibleFreshUntilKey(fullKey: string): string {
    return `__gravito:flexible:freshUntil:${fullKey}`
  }

  protected async putMetaKey(metaKey: string, value: unknown, ttl: CacheTtl): Promise<void> {
    await this.store.put(metaKey, value, ttl)
  }

  protected async forgetMetaKey(metaKey: string): Promise<void> {
    await this.store.forget(metaKey)
  }

  /**
   * Retrieve an item from the cache by its key.
   *
   * Fetches the value from the underlying store. If not found, returns the
   * provided default value or executes the factory function.
   *
   * @param key - The unique cache key.
   * @param defaultValue - A default value or factory function to use if the key is not found.
   * @returns The cached value, or the default value if not found.
   * @throws {Error} If the underlying store fails to retrieve the value.
   *
   * @example
   * ```typescript
   * const user = await cache.get('user:1', { name: 'Guest' });
   * const settings = await cache.get('settings', () => fetchSettings());
   * ```
   */
  async get<T = unknown>(
    key: CacheKey,
    defaultValue?: T | (() => T | Promise<T>)
  ): Promise<T | null> {
    const fullKey = this.key(key)
    const value = await this.store.get<T>(fullKey)
    if (value !== null) {
      const e = this.emit('hit', { key: fullKey })
      if (e) {
        await e
      }
      return value
    }

    const e = this.emit('miss', { key: fullKey })
    if (e) {
      await e
    }
    if (defaultValue === undefined) {
      return null
    }
    if (typeof defaultValue === 'function') {
      return (defaultValue as () => T | Promise<T>)()
    }
    return defaultValue
  }

  /**
   * Determine if an item exists in the cache.
   *
   * Checks for the presence of a key without necessarily returning its value.
   *
   * @param key - The cache key.
   * @returns True if the item exists, false otherwise.
   * @throws {Error} If the underlying store fails to check existence.
   *
   * @example
   * ```typescript
   * if (await cache.has('session:active')) {
   *   // ...
   * }
   * ```
   */
  async has(key: CacheKey): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  /**
   * Determine if an item is missing from the cache.
   *
   * Inverse of `has()`, used for cleaner conditional logic.
   *
   * @param key - The cache key.
   * @returns True if the item is missing, false otherwise.
   * @throws {Error} If the underlying store fails to check existence.
   *
   * @example
   * ```typescript
   * if (await cache.missing('config:loaded')) {
   *   await loadConfig();
   * }
   * ```
   */
  async missing(key: CacheKey): Promise<boolean> {
    return !(await this.has(key))
  }

  /**
   * Store an item in the cache for a specific duration.
   *
   * Persists the value in the underlying store with the given TTL.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live.
   * @throws {Error} If the underlying store fails to persist the value.
   *
   * @example
   * ```typescript
   * await cache.put('token', 'xyz123', 3600);
   * ```
   */
  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const fullKey = this.key(key)
    await this.store.put(fullKey, value, ttl)
    const e = this.emit('write', { key: fullKey })
    if (e) {
      await e
    }
  }

  /**
   * Store an item in the cache for a specific duration.
   *
   * Uses the repository's default TTL if none is provided.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Optional time-to-live.
   * @throws {Error} If the underlying store fails to persist the value.
   *
   * @example
   * ```typescript
   * await cache.set('theme', 'dark');
   * ```
   */
  async set(key: CacheKey, value: unknown, ttl?: CacheTtl): Promise<void> {
    const resolved = ttl ?? this.options.defaultTtl
    await this.put(key, value, resolved)
  }

  /**
   * Store an item in the cache only if the key does not already exist.
   *
   * Atomic operation to prevent overwriting existing data.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Optional time-to-live.
   * @returns True if the item was added, false otherwise.
   * @throws {Error} If the underlying store fails the atomic operation.
   *
   * @example
   * ```typescript
   * const added = await cache.add('lock:process', true, 60);
   * ```
   */
  async add(key: CacheKey, value: unknown, ttl?: CacheTtl): Promise<boolean> {
    const fullKey = this.key(key)
    const resolved = ttl ?? this.options.defaultTtl
    const ok = await this.store.add(fullKey, value, resolved)
    if (ok) {
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }
    }
    return ok
  }

  /**
   * Store an item in the cache indefinitely.
   *
   * Sets the TTL to null, indicating the value should not expire automatically.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @throws {Error} If the underlying store fails to persist the value.
   *
   * @example
   * ```typescript
   * await cache.forever('system:id', 'node-01');
   * ```
   */
  async forever(key: CacheKey, value: unknown): Promise<void> {
    await this.put(key, value, null)
  }

  /**
   * Get an item from the cache, or execute the given callback and store the result.
   *
   * Implements the "Cache-Aside" pattern, ensuring the callback is only executed
   * on a cache miss.
   *
   * @param key - The unique cache key.
   * @param ttl - Time-to-live.
   * @param callback - The callback to execute if the key is not found.
   * @returns The cached value or the result of the callback.
   * @throws {Error} If the callback or the underlying store fails.
   *
   * @example
   * ```typescript
   * const data = await cache.remember('users:all', 300, () => db.users.findMany());
   * ```
   */
  async remember<T = unknown>(
    key: CacheKey,
    ttl: CacheTtl,
    callback: () => Promise<T> | T
  ): Promise<T> {
    const existing = await this.get<T>(key)
    if (existing !== null) {
      return existing
    }

    const value = await callback()
    await this.put(key, value, ttl)
    return value
  }

  /**
   * Get an item from the cache, or execute the given callback and store the result indefinitely.
   *
   * Similar to `remember()`, but the value is stored without an expiration time.
   *
   * @param key - The unique cache key.
   * @param callback - The callback to execute if the key is not found.
   * @returns The cached value or the result of the callback.
   * @throws {Error} If the callback or the underlying store fails.
   *
   * @example
   * ```typescript
   * const config = await cache.rememberForever('app:config', () => loadConfig());
   * ```
   */
  async rememberForever<T = unknown>(key: CacheKey, callback: () => Promise<T> | T): Promise<T> {
    return this.remember(key, null, callback)
  }

  /**
   * Retrieve multiple items from the cache by their keys.
   *
   * Efficiently fetches multiple values, returning a map of keys to values.
   *
   * @param keys - An array of unique cache keys.
   * @returns An object where keys are the original keys and values are the cached values.
   * @throws {Error} If the underlying store fails to retrieve values.
   *
   * @example
   * ```typescript
   * const results = await cache.many(['user:1', 'user:2']);
   * ```
   */
  async many<T = unknown>(keys: readonly CacheKey[]): Promise<Record<string, T | null>> {
    const out: Record<string, T | null> = {}
    for (const key of keys) {
      out[String(key)] = await this.get<T>(key)
    }
    return out
  }

  /**
   * Store multiple items in the cache for a specific duration.
   *
   * Persists multiple key-value pairs in a single operation if supported by the store.
   *
   * @param values - An object where keys are the unique cache keys and values are the values to store.
   * @param ttl - Time-to-live.
   * @throws {Error} If the underlying store fails to persist values.
   *
   * @example
   * ```typescript
   * await cache.putMany({ 'a': 1, 'b': 2 }, 60);
   * ```
   */
  async putMany(values: Record<string, unknown>, ttl: CacheTtl): Promise<void> {
    await Promise.all(Object.entries(values).map(([k, v]) => this.put(k, v, ttl)))
  }

  /**
   * Laravel-like flexible cache (stale-while-revalidate).
   *
   * Serves stale content while revalidating the cache in the background. This
   * minimizes latency for users by avoiding synchronous revalidation.
   *
   * @param key - The unique cache key.
   * @param ttlSeconds - How long the value is considered fresh.
   * @param staleSeconds - How long the stale value may be served while a refresh happens.
   * @param callback - The callback to execute to refresh the cache.
   * @returns The fresh or stale cached value.
   * @throws {Error} If the callback fails on a cache miss.
   *
   * @example
   * ```typescript
   * const value = await cache.flexible('stats', 60, 30, () => fetchStats());
   * ```
   */
  async flexible<T = unknown>(
    key: CacheKey,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<T> {
    const fullKey = this.key(key)
    const metaKey = this.flexibleFreshUntilKey(fullKey)
    const now = Date.now()
    const ttlMillis = Math.max(0, ttlSeconds) * 1000
    const staleMillis = Math.max(0, staleSeconds) * 1000

    const [freshUntil, cachedValue] = await Promise.all([
      this.store.get<number>(metaKey),
      this.store.get<T>(fullKey),
    ])

    if (freshUntil !== null && cachedValue !== null) {
      if (now <= freshUntil) {
        const e = this.emit('hit', { key: fullKey })
        if (e) {
          await e
        }
        return cachedValue
      }

      if (now <= freshUntil + staleMillis) {
        const e = this.emit('hit', { key: fullKey })
        if (e) {
          await e
        }
        void this.refreshFlexible(fullKey, metaKey, ttlSeconds, staleSeconds, callback)
        return cachedValue
      }
    }

    const e = this.emit('miss', { key: fullKey })
    if (e) {
      await e
    }
    const value = await callback()
    const totalTtl = ttlSeconds + staleSeconds
    await this.store.put(fullKey, value, totalTtl)
    await this.putMetaKey(metaKey, now + ttlMillis, totalTtl)
    {
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }
    }
    return value
  }

  private async refreshFlexible<T>(
    fullKey: string,
    metaKey: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<void> {
    if (this.refreshSemaphore.has(fullKey)) {
      return
    }

    const refreshPromise = this.doRefresh(fullKey, metaKey, ttlSeconds, staleSeconds, callback)
    this.refreshSemaphore.set(fullKey, refreshPromise)

    try {
      await refreshPromise
    } finally {
      this.refreshSemaphore.delete(fullKey)
    }
  }

  private async doRefresh<T>(
    fullKey: string,
    metaKey: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ): Promise<void> {
    if (!this.store.lock) {
      return
    }

    const lock = this.store.lock(`flexible:${metaKey}`, Math.max(1, ttlSeconds))
    if (!lock || !(await lock.acquire())) {
      return
    }

    const startTime = Date.now()
    try {
      const timeoutMillis = this.options.refreshTimeout ?? 30000
      const maxRetries = this.options.maxRetries ?? 0
      const retryDelay = this.options.retryDelay ?? 50
      let lastError: unknown
      let value: T | undefined

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          value = await Promise.race([
            Promise.resolve(callback()),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Refresh timeout')), timeoutMillis)
            ),
          ])
          break
        } catch (err) {
          lastError = err
          if (attempt < maxRetries) {
            await sleep(retryDelay)
          }
        }
      }

      if (value === undefined && lastError) {
        throw lastError
      }

      const totalTtl = ttlSeconds + staleSeconds
      const now = Date.now()
      await this.store.put(fullKey, value, totalTtl)
      await this.putMetaKey(metaKey, now + Math.max(0, ttlSeconds) * 1000, totalTtl)
      const e = this.emit('write', { key: fullKey })
      if (e) {
        await e
      }

      this.flexibleStats.refreshCount++
      this.flexibleStats.totalTime += Date.now() - startTime
    } catch {
      this.flexibleStats.refreshFailures++
    } finally {
      await lock.release()
    }
  }

  /**
   * Retrieve an item from the cache and delete it.
   *
   * Atomic-like operation to fetch and immediately remove a value, often used
   * for one-time tokens or flash messages.
   *
   * @param key - The unique cache key.
   * @param defaultValue - A default value to use if the key is not found.
   * @returns The cached value, or the default value if not found.
   * @throws {Error} If the underlying store fails to retrieve or forget the value.
   *
   * @example
   * ```typescript
   * const message = await cache.pull('flash:status');
   * ```
   */
  async pull<T = unknown>(key: CacheKey, defaultValue?: T): Promise<T | null> {
    const value = await this.get<T>(key, defaultValue as T)
    await this.forget(key)
    return value
  }

  /**
   * Remove an item from the cache by its key.
   *
   * Deletes the value and any associated metadata from the underlying store.
   *
   * @param key - The cache key to remove.
   * @returns True if the item existed and was removed.
   * @throws {Error} If the underlying store fails to remove the value.
   *
   * @example
   * ```typescript
   * const deleted = await cache.forget('user:session');
   * ```
   */
  async forget(key: CacheKey): Promise<boolean> {
    const fullKey = this.key(key)
    const metaKey = this.flexibleFreshUntilKey(fullKey)
    const ok = await this.store.forget(fullKey)
    await this.forgetMetaKey(metaKey)
    if (ok) {
      const e = this.emit('forget', { key: fullKey })
      if (e) {
        await e
      }
    }
    return ok
  }

  /**
   * Alias for `forget`.
   *
   * Provides compatibility with standard `Map`-like or `Storage` APIs.
   *
   * @param key - The cache key to remove.
   * @returns True if the item existed and was removed.
   * @throws {Error} If the underlying store fails to remove the value.
   *
   * @example
   * ```typescript
   * await cache.delete('temp:data');
   * ```
   */
  async delete(key: CacheKey): Promise<boolean> {
    return this.forget(key)
  }

  /**
   * Remove all items from the cache storage.
   *
   * Clears the entire underlying store. Use with caution as this affects all
   * keys regardless of prefix.
   *
   * @throws {Error} If the underlying store fails to flush.
   *
   * @example
   * ```typescript
   * await cache.flush();
   * ```
   */
  async flush(): Promise<void> {
    await this.store.flush()
    const e = this.emit('flush')
    if (e) {
      await e
    }
  }

  /**
   * Alias for `flush`.
   *
   * Provides compatibility with standard `Map`-like or `Storage` APIs.
   *
   * @throws {Error} If the underlying store fails to clear.
   *
   * @example
   * ```typescript
   * await cache.clear();
   * ```
   */
  async clear(): Promise<void> {
    return this.flush()
  }

  /**
   * Increment the value of a numeric item in the cache.
   *
   * Atomically increases the value of a key. If the key does not exist, it is
   * typically initialized to 0 before incrementing.
   *
   * @param key - The cache key.
   * @param value - The amount to increment by.
   * @returns The new value.
   * @throws {Error} If the underlying store fails the atomic increment.
   *
   * @example
   * ```typescript
   * const count = await cache.increment('page:views');
   * ```
   */
  increment(key: string, value?: number) {
    return this.store.increment(this.key(key), value)
  }

  /**
   * Decrement the value of a numeric item in the cache.
   *
   * Atomically decreases the value of a key.
   *
   * @param key - The cache key.
   * @param value - The amount to decrement by.
   * @returns The new value.
   * @throws {Error} If the underlying store fails the atomic decrement.
   *
   * @example
   * ```typescript
   * const remaining = await cache.decrement('stock:count');
   * ```
   */
  decrement(key: string, value?: number) {
    return this.store.decrement(this.key(key), value)
  }

  /**
   * Get a distributed lock instance for the given name.
   *
   * Provides a mechanism for exclusive access to resources across multiple
   * processes or servers.
   *
   * @param name - The lock name.
   * @param seconds - Optional default duration for the lock in seconds.
   * @returns A `CacheLock` instance if supported, otherwise undefined.
   *
   * @example
   * ```typescript
   * const lock = cache.lock('process:heavy', 10);
   * if (await lock.acquire()) {
   *   try {
   *     // ...
   *   } finally {
   *     await lock.release();
   *   }
   * }
   * ```
   */
  lock(name: string, seconds?: number) {
    return this.store.lock ? this.store.lock(this.key(name), seconds) : undefined
  }

  /**
   * Create a new repository instance with the given tags.
   *
   * Enables grouping of cache entries for collective operations like flushing
   * all keys associated with specific tags.
   *
   * @param tags - An array of tag names.
   * @returns A new `CacheRepository` instance that uses the given tags.
   * @throws {Error} If the underlying store does not support tagging.
   *
   * @example
   * ```typescript
   * await cache.tags(['users', 'profiles']).put('user:1', data, 3600);
   * await cache.tags(['users']).flush();
   * ```
   */
  tags(tags: readonly string[]) {
    if (!isTaggableStore(this.store)) {
      throw new Error('This cache store does not support tags.')
    }
    return new CacheRepository(new TaggedStore(this.store, tags), this.options)
  }

  /**
   * Retrieve the underlying cache store.
   *
   * Provides direct access to the low-level store implementation for advanced
   * use cases or debugging.
   *
   * @returns The low-level cache store instance.
   *
   * @example
   * ```typescript
   * const store = cache.getStore();
   * ```
   */
  getStore(): CacheStore {
    return this.store
  }
}

class TaggedStore implements CacheStore {
  constructor(
    private readonly store: CacheStore & {
      flushTags: (tags: readonly string[]) => Promise<void>
      tagKey: (key: string, tags: readonly string[]) => string
      tagIndexAdd: (tags: readonly string[], taggedKey: string) => void
    },
    private readonly tags: readonly string[]
  ) {}

  private tagged(key: CacheKey): string {
    return this.store.tagKey(normalizeCacheKey(key), this.tags)
  }

  async get<T = unknown>(key: CacheKey) {
    return this.store.get<T>(this.tagged(key))
  }

  async put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void> {
    const taggedKey = this.tagged(key)
    await this.store.put(taggedKey, value, ttl)
    this.store.tagIndexAdd(this.tags, taggedKey)
  }

  async add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean> {
    const taggedKey = this.tagged(key)
    const ok = await this.store.add(taggedKey, value, ttl)
    if (ok) {
      this.store.tagIndexAdd(this.tags, taggedKey)
    }
    return ok
  }

  async forget(key: CacheKey): Promise<boolean> {
    return this.store.forget(this.tagged(key))
  }

  async flush(): Promise<void> {
    return this.store.flushTags(this.tags)
  }

  async increment(key: CacheKey, value?: number): Promise<number> {
    const taggedKey = this.tagged(key)
    const next = await this.store.increment(taggedKey, value)
    this.store.tagIndexAdd(this.tags, taggedKey)
    return next
  }

  async decrement(key: CacheKey, value?: number): Promise<number> {
    const taggedKey = this.tagged(key)
    const next = await this.store.decrement(taggedKey, value)
    this.store.tagIndexAdd(this.tags, taggedKey)
    return next
  }

  lock(name: string, seconds?: number): CacheLock | undefined {
    return this.store.lock ? this.store.lock(this.tagged(name), seconds) : undefined
  }
}
