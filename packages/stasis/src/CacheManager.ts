import { type CacheEventMode, type CacheEvents, CacheRepository } from './CacheRepository'
import { RateLimiter } from './RateLimiter'
import type { CacheStore } from './store'
import type { CacheTtl } from './types'

/**
 * Configuration for a specific cache store driver.
 *
 * Defines the connection parameters and behavior for different storage backends
 * like in-memory, local filesystem, or Redis.
 *
 * @public
 * @since 3.0.0
 */
export type StoreConfig =
  | { driver: 'memory'; maxItems?: number }
  | { driver: 'file'; directory: string }
  | { driver: 'redis'; connection?: string; prefix?: string }
  | { driver: 'null' }
  // legacy adapter: allow plugging any provider that matches old interface
  | { driver: 'provider' }
  | { driver: 'tiered'; local: string; remote: string }
  | {
      driver: 'circuit-breaker'
      primary: string
      maxFailures?: number
      resetTimeout?: number
      fallback?: string
    }

/**
 * Global cache configuration for managing multiple named stores.
 *
 * Provides a central manifest to define default behavior, global key prefixing,
 * and the registry of available storage backends.
 *
 * @public
 * @since 3.0.0
 */
export type CacheConfig = {
  /**
   * The name of the default store to use when no store is explicitly requested.
   * @defaultValue 'memory'
   */
  default?: string
  /**
   * Global prefix prepended to all cache keys across all stores to prevent collisions.
   */
  prefix?: string
  /**
   * Global default time-to-live for cache entries when not specified in write operations.
   */
  defaultTtl?: CacheTtl
  /**
   * Map of named store configurations, optionally including pre-instantiated providers.
   */
  stores?: Record<string, StoreConfig & { provider?: CacheStore }>
}

/**
 * Orchestrates multiple cache stores and provides a unified API.
 *
 * Acts as a central registry for cache repositories, supporting various drivers
 * (Memory, File, Redis). It provides both a multi-store API for targeted operations
 * and a proxy API that forwards calls to the default store.
 *
 * @example
 * ```typescript
 * const cache = new CacheManager(factory, {
 *   default: 'redis',
 *   stores: {
 *     redis: { driver: 'redis', prefix: 'myapp:' }
 *   }
 * });
 *
 * await cache.set('key', 'value', 3600);
 * const val = await cache.get('key');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class CacheManager {
  /**
   * Internal registry of initialized cache repositories.
   */
  private stores = new Map<string, CacheRepository>()

  /**
   * Initialize a new CacheManager instance.
   *
   * @param storeFactory - Factory function to create low-level store instances by name.
   * @param config - Configuration manifest for stores and global defaults.
   * @param events - Optional event handlers for cache lifecycle hooks.
   * @param eventOptions - Configuration for how events are dispatched and handled.
   */
  constructor(
    private readonly storeFactory: (name: string) => CacheStore,
    private readonly config: CacheConfig = {},
    private readonly events?: CacheEvents,
    private readonly eventOptions?: {
      mode?: CacheEventMode
      throwOnError?: boolean
      onError?: (error: unknown, event: keyof CacheEvents, payload: { key?: string }) => void
    }
  ) {}

  /**
   * Get a rate limiter instance for a specific store.
   *
   * Provides a specialized interface for throttling actions based on cache keys,
   * leveraging the underlying storage for persistence.
   *
   * @param name - Store name (defaults to the configured default store).
   * @returns A RateLimiter instance bound to the requested store.
   * @throws {Error} If the requested store cannot be initialized.
   *
   * @example
   * ```typescript
   * const limiter = cache.limiter('redis');
   * if (await limiter.tooManyAttempts('login:1', 5)) {
   *   throw new Error('Too many attempts');
   * }
   * ```
   */
  limiter(name?: string): RateLimiter {
    // We access the underlying store directly from the repository
    return new RateLimiter(this.store(name).getStore())
  }

  /**
   * Resolve a named cache repository.
   *
   * Lazily initializes and caches the repository instance for the given store name.
   * If no name is provided, it falls back to the default store.
   *
   * @param name - The name of the store to retrieve.
   * @returns The initialized CacheRepository instance.
   * @throws {Error} If the store factory fails to create the underlying store.
   *
   * @example
   * ```typescript
   * const redis = cache.store('redis');
   * await redis.put('key', 'value', 60);
   * ```
   */
  store(name?: string): CacheRepository {
    const storeName = name ?? this.config.default ?? 'memory'
    const existing = this.stores.get(storeName)
    if (existing) {
      return existing
    }

    const repo = new CacheRepository(this.storeFactory(storeName), {
      prefix: this.config.prefix,
      defaultTtl: this.config.defaultTtl,
      events: this.events,
      eventsMode: this.eventOptions?.mode,
      throwOnEventError: this.eventOptions?.throwOnError,
      onEventError: this.eventOptions?.onError,
    })
    this.stores.set(storeName, repo)
    return repo
  }

  // Laravel-like proxy methods (default store)

  /**
   * Retrieve an item from the default cache store.
   *
   * If the key is missing, the provided default value or the result of the
   * default value closure will be returned.
   *
   * @param key - The unique cache key.
   * @param defaultValue - The fallback value or closure to execute on miss.
   * @returns The cached value or the resolved default.
   * @throws {Error} If the underlying store driver encounters a read error.
   *
   * @example
   * ```typescript
   * const value = await cache.get('user:1', { name: 'Guest' });
   * ```
   */
  get<T = unknown>(key: string, defaultValue?: T | (() => T | Promise<T>)) {
    return this.store().get<T>(key, defaultValue)
  }

  /**
   * Determine if an item exists in the default cache store.
   *
   * @param key - The unique cache key.
   * @returns True if the key exists and has not expired.
   * @throws {Error} If the underlying store driver encounters a connection error.
   *
   * @example
   * ```typescript
   * if (await cache.has('session:active')) {
   *   // ...
   * }
   * ```
   */
  has(key: string) {
    return this.store().has(key)
  }

  /**
   * Determine if an item is missing from the default cache store.
   *
   * @param key - The unique cache key.
   * @returns True if the key does not exist or has expired.
   * @throws {Error} If the underlying store driver encounters a connection error.
   *
   * @example
   * ```typescript
   * if (await cache.missing('config:loaded')) {
   *   await loadConfig();
   * }
   * ```
   */
  missing(key: string) {
    return this.store().missing(key)
  }

  /**
   * Store an item in the default cache store for a specific duration.
   *
   * @param key - The unique cache key.
   * @param value - The data to be cached.
   * @param ttl - Expiration time in seconds or a specific Date.
   * @returns A promise that resolves when the write is complete.
   * @throws {Error} If the value cannot be serialized or the store is read-only.
   *
   * @example
   * ```typescript
   * await cache.put('key', 'value', 60); // 60 seconds
   * ```
   */
  put(key: string, value: unknown, ttl: CacheTtl) {
    return this.store().put(key, value, ttl)
  }

  /**
   * Store an item in the default cache store (alias for put).
   *
   * @param key - The unique cache key.
   * @param value - The data to be cached.
   * @param ttl - Optional expiration time.
   * @returns A promise that resolves when the write is complete.
   * @throws {Error} If the underlying store driver encounters a write error.
   *
   * @example
   * ```typescript
   * await cache.set('theme', 'dark');
   * ```
   */
  set(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().set(key, value, ttl)
  }

  /**
   * Store an item in the default cache store only if it does not already exist.
   *
   * @param key - The unique cache key.
   * @param value - The data to be cached.
   * @param ttl - Optional expiration time.
   * @returns True if the item was added, false if it already existed.
   * @throws {Error} If the underlying store driver encounters a write error.
   *
   * @example
   * ```typescript
   * const added = await cache.add('lock:process', true, 30);
   * ```
   */
  add(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().add(key, value, ttl)
  }

  /**
   * Store an item in the default cache store indefinitely.
   *
   * @param key - The unique cache key.
   * @param value - The data to be cached.
   * @returns A promise that resolves when the write is complete.
   * @throws {Error} If the underlying store driver encounters a write error.
   *
   * @example
   * ```typescript
   * await cache.forever('system:version', '1.0.0');
   * ```
   */
  forever(key: string, value: unknown) {
    return this.store().forever(key, value)
  }

  /**
   * Get an item from the cache, or execute the callback and store the result.
   *
   * This is a "get or set" operation that ensures the value is cached after
   * the first miss.
   *
   * @param key - The unique cache key.
   * @param ttl - Time to live for the cached result if a miss occurs.
   * @param callback - The closure to execute to fetch the fresh data.
   * @returns The cached or freshly fetched value.
   * @throws {Error} If the callback throws or the store write fails.
   *
   * @example
   * ```typescript
   * const user = await cache.remember('user:1', 60, async () => {
   *   return await db.findUser(1);
   * });
   * ```
   */
  remember<T = unknown>(key: string, ttl: CacheTtl, callback: () => Promise<T> | T) {
    return this.store().remember<T>(key, ttl, callback)
  }

  /**
   * Get an item from the cache, or execute the callback and store the result forever.
   *
   * @param key - The unique cache key.
   * @param callback - The closure to execute to fetch the fresh data.
   * @returns The cached or freshly fetched value.
   * @throws {Error} If the callback throws or the store write fails.
   *
   * @example
   * ```typescript
   * const settings = await cache.rememberForever('global:settings', () => {
   *   return fetchSettingsFromApi();
   * });
   * ```
   */
  rememberForever<T = unknown>(key: string, callback: () => Promise<T> | T) {
    return this.store().rememberForever<T>(key, callback)
  }

  /**
   * Retrieve multiple items from the default cache store by their keys.
   *
   * @param keys - An array of unique cache keys.
   * @returns An object mapping keys to their cached values (or null if missing).
   * @throws {Error} If the underlying store driver encounters a read error.
   *
   * @example
   * ```typescript
   * const values = await cache.many(['key1', 'key2']);
   * ```
   */
  many<T = unknown>(keys: readonly string[]) {
    return this.store().many<T>(keys)
  }

  /**
   * Store multiple items in the default cache store for a specific duration.
   *
   * @param values - An object mapping keys to the values to be stored.
   * @param ttl - Expiration time in seconds or a specific Date.
   * @returns A promise that resolves when all writes are complete.
   * @throws {Error} If the underlying store driver encounters a write error.
   *
   * @example
   * ```typescript
   * await cache.putMany({ a: 1, b: 2 }, 60);
   * ```
   */
  putMany(values: Record<string, unknown>, ttl: CacheTtl) {
    return this.store().putMany(values, ttl)
  }

  /**
   * Get an item from the cache, allowing stale data while refreshing in background.
   *
   * Implements the Stale-While-Revalidate pattern to minimize latency for
   * frequently accessed but expensive data.
   *
   * @param key - The unique cache key.
   * @param ttlSeconds - How long the value is considered fresh.
   * @param staleSeconds - How long to serve stale data while refreshing.
   * @param callback - The closure to execute to refresh the data.
   * @returns The cached (possibly stale) or freshly fetched value.
   * @throws {Error} If the callback throws during an initial fetch.
   *
   * @example
   * ```typescript
   * const data = await cache.flexible('stats', 60, 30, () => fetchStats());
   * ```
   */
  flexible<T = unknown>(
    key: string,
    ttlSeconds: number,
    staleSeconds: number,
    callback: () => Promise<T> | T
  ) {
    return this.store().flexible<T>(key, ttlSeconds, staleSeconds, callback)
  }

  /**
   * Retrieve an item from the default cache store and then delete it.
   *
   * Useful for one-time notifications or temporary tokens.
   *
   * @param key - The unique cache key.
   * @param defaultValue - Fallback value if the key is missing.
   * @returns The cached value before deletion, or the default.
   * @throws {Error} If the underlying store driver encounters a read or delete error.
   *
   * @example
   * ```typescript
   * const token = await cache.pull('temp_token');
   * ```
   */
  pull<T = unknown>(key: string, defaultValue?: T) {
    return this.store().pull<T>(key, defaultValue)
  }

  /**
   * Remove an item from the default cache store.
   *
   * @param key - The unique cache key.
   * @returns True if the item was removed, false otherwise.
   * @throws {Error} If the underlying store driver encounters a delete error.
   *
   * @example
   * ```typescript
   * await cache.forget('user:1');
   * ```
   */
  forget(key: string) {
    return this.store().forget(key)
  }

  /**
   * Remove an item from the default cache store (alias for forget).
   *
   * @param key - The unique cache key.
   * @returns True if the item was removed, false otherwise.
   * @throws {Error} If the underlying store driver encounters a delete error.
   *
   * @example
   * ```typescript
   * await cache.delete('old_key');
   * ```
   */
  delete(key: string) {
    return this.store().delete(key)
  }

  /**
   * Remove all items from the default cache store.
   *
   * @returns A promise that resolves when the flush is complete.
   * @throws {Error} If the underlying store driver encounters a flush error.
   *
   * @example
   * ```typescript
   * await cache.flush();
   * ```
   */
  flush() {
    return this.store().flush()
  }

  /**
   * Clear the entire default cache store (alias for flush).
   *
   * @returns A promise that resolves when the clear is complete.
   * @throws {Error} If the underlying store driver encounters a clear error.
   *
   * @example
   * ```typescript
   * await cache.clear();
   * ```
   */
  clear() {
    return this.store().clear()
  }

  /**
   * Increment the value of an integer item in the default cache store.
   *
   * @param key - The unique cache key.
   * @param value - The amount to increment by (defaults to 1).
   * @returns The new value after incrementing.
   * @throws {Error} If the value is not an integer or the store is read-only.
   *
   * @example
   * ```typescript
   * const count = await cache.increment('page_views');
   * ```
   */
  increment(key: string, value?: number) {
    return this.store().increment(key, value)
  }

  /**
   * Decrement the value of an integer item in the default cache store.
   *
   * @param key - The unique cache key.
   * @param value - The amount to decrement by (defaults to 1).
   * @returns The new value after decrementing.
   * @throws {Error} If the value is not an integer or the store is read-only.
   *
   * @example
   * ```typescript
   * const remaining = await cache.decrement('stock:1');
   * ```
   */
  decrement(key: string, value?: number) {
    return this.store().decrement(key, value)
  }

  /**
   * Get a distributed lock instance from the default cache store.
   *
   * @param name - The unique name of the lock.
   * @param seconds - The duration the lock should be held for.
   * @returns A CacheLock instance.
   * @throws {Error} If the underlying store does not support locking.
   *
   * @example
   * ```typescript
   * const lock = cache.lock('process_data', 10);
   * if (await lock.get()) {
   *   // ...
   *   await lock.release();
   * }
   * ```
   */
  lock(name: string, seconds?: number) {
    return this.store().lock(name, seconds)
  }

  /**
   * Access a tagged cache section for grouped operations.
   *
   * Tags allow you to clear groups of cache entries simultaneously.
   * Note: This is only supported by specific drivers like 'memory'.
   *
   * @param tags - An array of tag names.
   * @returns A tagged cache repository instance.
   * @throws {Error} If the underlying store driver does not support tags.
   *
   * @example
   * ```typescript
   * await cache.tags(['users', 'profiles']).put('user:1', data, 60);
   * await cache.tags(['users']).flush(); // Clears all 'users' tagged entries
   * ```
   */
  tags(tags: readonly string[]) {
    return this.store().tags(tags)
  }
}
