import type { CacheLock } from './locks'
import type { CacheKey, CacheTtl, CacheValue } from './types'

/**
 * Interface for a low-level cache storage backend.
 *
 * All cache drivers (Memory, Redis, etc.) must implement this interface.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheStore {
  /**
   * Retrieve an item from the cache by its key.
   *
   * @param key - The unique cache key.
   * @returns A promise that resolves to the cached value, or null if not found or expired.
   */
  get<T = unknown>(key: CacheKey): Promise<CacheValue<T>>

  /**
   * Store an item in the cache for a specific duration.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live.
   */
  put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void>

  /**
   * Store an item in the cache only if the key does not already exist.
   *
   * @param key - The unique cache key.
   * @param value - The value to store.
   * @param ttl - Time-to-live.
   * @returns A promise that resolves to true if the item was added, false otherwise.
   */
  add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean>

  /**
   * Remove an item from the cache by its key.
   *
   * @param key - The cache key to remove.
   * @returns A promise that resolves to true if the item existed and was removed.
   */
  forget(key: CacheKey): Promise<boolean>

  /**
   * Remove all items from the cache storage.
   */
  flush(): Promise<void>

  /**
   * Increment the value of a numeric item in the cache.
   *
   * @param key - The cache key.
   * @param value - The amount to increment by.
   * @returns The new value.
   */
  increment(key: CacheKey, value?: number): Promise<number>

  /**
   * Decrement the value of a numeric item in the cache.
   *
   * @param key - The cache key.
   * @param value - The amount to decrement by.
   * @returns The new value.
   */
  decrement(key: CacheKey, value?: number): Promise<number>

  /**
   * Get a distributed lock instance for the given name.
   *
   * @param name - The lock name.
   * @param seconds - Optional default duration for the lock.
   * @returns A `CacheLock` instance if supported, otherwise undefined.
   */
  lock?(name: string, seconds?: number): CacheLock | undefined

  /**
   * Get the remaining time-to-live (TTL) for a key in seconds.
   *
   * @param key - The cache key.
   * @returns The remaining TTL in seconds, or null if the key doesn't exist or has no expiration.
   */
  ttl?(key: CacheKey): Promise<number | null>
}

/**
 * Interface for cache stores that support grouping entries by tags.
 *
 * @public
 * @since 3.0.0
 */
export interface TaggableStore {
  /**
   * Remove all items associated with the given tags.
   *
   * @param tags - An array of tag names.
   */
  flushTags(tags: readonly string[]): Promise<void>

  /**
   * Generate a tagged key for storage based on the provided tags.
   *
   * @param key - The original cache key.
   * @param tags - An array of tag names.
   * @returns The tagged key string.
   */
  tagKey(key: string, tags: readonly string[]): string

  /**
   * Add a key to the index for specific tags.
   *
   * @param tags - An array of tag names.
   * @param taggedKey - The key to associate with the tags.
   */
  tagIndexAdd(tags: readonly string[], taggedKey: string): void | Promise<void>

  /**
   * Remove a key from the tag index.
   *
   * @param taggedKey - The key to remove from all tag indexes.
   */
  tagIndexRemove(taggedKey: string): void | Promise<void>
}

/**
 * Type guard to check if a cache store supports tagging.
 *
 * @param store - The cache store instance to check.
 * @returns `true` if the store implements `TaggableStore`.
 *
 * @public
 * @since 3.0.0
 */
export function isTaggableStore(store: CacheStore): store is CacheStore & TaggableStore {
  return (
    typeof (store as Partial<TaggableStore>).flushTags === 'function' &&
    typeof (store as Partial<TaggableStore>).tagKey === 'function' &&
    typeof (store as Partial<TaggableStore>).tagIndexAdd === 'function' &&
    typeof (store as Partial<TaggableStore>).tagIndexRemove === 'function'
  )
}
