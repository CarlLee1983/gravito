import { type CacheEventMode, type CacheEvents, CacheRepository } from './CacheRepository'
import { RateLimiter } from './RateLimiter'
import type { CacheStore } from './store'
import type { CacheTtl } from './types'

export type StoreConfig =
  | { driver: 'memory'; maxItems?: number }
  | { driver: 'file'; directory: string }
  | { driver: 'redis'; connection?: string; prefix?: string }
  | { driver: 'null' }
  // legacy adapter: allow plugging any provider that matches old interface
  | { driver: 'provider' }

export type CacheConfig = {
  default?: string
  prefix?: string
  defaultTtl?: CacheTtl
  stores?: Record<string, StoreConfig & { provider?: CacheStore }>
}

export class CacheManager {
  private stores = new Map<string, CacheRepository>()

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
   * Get a rate limiter instance for a store
   * @param name - Store name (optional, defaults to default store)
   */
  limiter(name?: string): RateLimiter {
    // We access the underlying store directly from the repository
    return new RateLimiter(this.store(name).getStore())
  }

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
   * Retrieve an item from the cache.
   *
   * @param key - The unique cache key.
   * @param defaultValue - The default value if the key is missing (can be a value or a closure).
   * @returns The cached value or the default.
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
   * Check if an item exists in the cache.
   */
  has(key: string) {
    return this.store().has(key)
  }

  /**
   * Check if an item is missing from the cache.
   */
  missing(key: string) {
    return this.store().missing(key)
  }

  /**
   * Store an item in the cache.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time to live in seconds (or Date).
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
   * Store an item in the cache (alias for put with optional TTL).
   */
  set(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().set(key, value, ttl)
  }

  /**
   * Store an item in the cache if it doesn't already exist.
   *
   * @returns True if added, false if it already existed.
   */
  add(key: string, value: unknown, ttl?: CacheTtl) {
    return this.store().add(key, value, ttl)
  }

  /**
   * Store an item in the cache indefinitely.
   */
  forever(key: string, value: unknown) {
    return this.store().forever(key, value)
  }

  /**
   * Get an item from the cache, or execute the callback and store the result.
   *
   * @param key - The cache key.
   * @param ttl - Time to live if the item is missing.
   * @param callback - Closure to execute on miss.
   * @returns The cached or fetched value.
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
   */
  rememberForever<T = unknown>(key: string, callback: () => Promise<T> | T) {
    return this.store().rememberForever<T>(key, callback)
  }

  /**
   * Retrieve multiple items from the cache.
   */
  many<T = unknown>(keys: readonly string[]) {
    return this.store().many<T>(keys)
  }

  /**
   * Store multiple items in the cache.
   */
  putMany(values: Record<string, unknown>, ttl: CacheTtl) {
    return this.store().putMany(values, ttl)
  }

  /**
   * Get an item from the cache, allowing stale data while refreshing in background.
   *
   * @param key - Cache key.
   * @param ttlSeconds - How long the value is considered fresh.
   * @param staleSeconds - How long to serve stale data while refreshing.
   * @param callback - Closure to refresh the data.
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
   * Retrieve an item from the cache and delete it.
   */
  pull<T = unknown>(key: string, defaultValue?: T) {
    return this.store().pull<T>(key, defaultValue)
  }

  /**
   * Remove an item from the cache.
   */
  forget(key: string) {
    return this.store().forget(key)
  }

  /**
   * Remove an item from the cache (alias for forget).
   */
  delete(key: string) {
    return this.store().delete(key)
  }

  /**
   * Remove all items from the cache.
   */
  flush() {
    return this.store().flush()
  }

  /**
   * Clear the entire cache (alias for flush).
   */
  clear() {
    return this.store().clear()
  }

  /**
   * Increment an integer item in the cache.
   */
  increment(key: string, value?: number) {
    return this.store().increment(key, value)
  }

  /**
   * Decrement an integer item in the cache.
   */
  decrement(key: string, value?: number) {
    return this.store().decrement(key, value)
  }

  /**
   * Get a lock instance.
   *
   * @param name - Lock name.
   * @param seconds - Lock duration.
   * @returns CacheLock instance.
   */
  lock(name: string, seconds?: number) {
    return this.store().lock(name, seconds)
  }

  /**
   * Access a tagged cache section (only supported by some stores).
   */
  tags(tags: readonly string[]) {
    return this.store().tags(tags)
  }
}
