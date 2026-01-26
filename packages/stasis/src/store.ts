import type { CacheLock } from './locks'
import type { CacheKey, CacheTtl, CacheValue } from './types'

/**
 * Low-level cache storage contract.
 *
 * Defines the essential operations for cache backends. Implementations of this interface
 * (e.g., Memory, Redis, File) provide the actual persistence logic for the cache system.
 *
 * @public
 * @since 3.0.0
 */
export interface CacheStore {
  /**
   * Retrieve an item from the cache.
   *
   * Fetches the value associated with the given key. If the item has expired or does not exist,
   * the implementation should return null.
   *
   * @param key - Unique identifier for the cached item.
   * @returns The cached value or null if missing/expired.
   * @throws {Error} If the storage backend is unreachable or encounters a read failure.
   */
  get<T = unknown>(key: CacheKey): Promise<CacheValue<T>>

  /**
   * Store an item in the cache.
   *
   * Persists a value with a specific expiration time. Overwrites any existing value for the same key.
   *
   * @param key - Unique identifier for the cached item.
   * @param value - Data to be persisted.
   * @param ttl - Duration in seconds until the item expires.
   * @returns Resolves when the write operation completes.
   * @throws {Error} If the storage backend is full or encounters a write failure.
   */
  put(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<void>

  /**
   * Store an item if it does not already exist.
   *
   * Atomic operation to ensure a value is only stored if the key is currently vacant.
   *
   * @param key - Unique identifier for the cached item.
   * @param value - Data to be persisted.
   * @param ttl - Duration in seconds until the item expires.
   * @returns True if the item was successfully added, false if it already existed.
   * @throws {Error} If the storage backend encounters a concurrency or write failure.
   */
  add(key: CacheKey, value: unknown, ttl: CacheTtl): Promise<boolean>

  /**
   * Remove an item from the cache.
   *
   * Deletes the entry associated with the specified key.
   *
   * @param key - Identifier of the item to be removed.
   * @returns True if the item existed and was removed, false otherwise.
   * @throws {Error} If the storage backend encounters a deletion failure.
   */
  forget(key: CacheKey): Promise<boolean>

  /**
   * Wipe all items from the cache storage.
   *
   * Clears the entire cache backend. Use with caution as this operation is destructive.
   *
   * @returns Resolves when the flush operation completes.
   * @throws {Error} If the storage backend fails to clear the data.
   */
  flush(): Promise<void>

  /**
   * Increment a numeric value in the cache.
   *
   * Atomically increases the value of a numeric item. If the key does not exist,
   * it is typically initialized to zero before incrementing.
   *
   * @param key - Identifier of the numeric item.
   * @param value - Amount to add to the current value.
   * @returns The updated numeric value.
   * @throws {TypeError} If the existing value is not numeric.
   * @throws {Error} If the storage backend encounters an atomic update failure.
   */
  increment(key: CacheKey, value?: number): Promise<number>

  /**
   * Decrement a numeric value in the cache.
   *
   * Atomically decreases the value of a numeric item. If the key does not exist,
   * it is typically initialized to zero before decrementing.
   *
   * @param key - Identifier of the numeric item.
   * @param value - Amount to subtract from the current value.
   * @returns The updated numeric value.
   * @throws {TypeError} If the existing value is not numeric.
   * @throws {Error} If the storage backend encounters an atomic update failure.
   */
  decrement(key: CacheKey, value?: number): Promise<number>

  /**
   * Create a distributed lock instance.
   *
   * Provides a mechanism for mutual exclusion across multiple processes or servers
   * using the cache backend as the synchronization provider.
   *
   * @param name - Unique name for the lock.
   * @param seconds - Default duration for which the lock should be held.
   * @returns A lock instance if supported by the driver, otherwise undefined.
   */
  lock?(name: string, seconds?: number): CacheLock | undefined

  /**
   * Get the remaining lifetime of a cached item.
   *
   * Calculates how many seconds are left before the item expires.
   *
   * @param key - Identifier of the cached item.
   * @returns Seconds remaining until expiration, or null if the key has no TTL or does not exist.
   * @throws {Error} If the storage backend encounters a read failure.
   */
  ttl?(key: CacheKey): Promise<number | null>
}

/**
 * Contract for cache stores supporting tag-based invalidation.
 *
 * Allows grouping cache entries under one or more tags, enabling bulk invalidation
 * of related items without knowing their individual keys.
 *
 * @public
 * @since 3.0.0
 */
export interface TaggableStore {
  /**
   * Invalidate all items associated with specific tags.
   *
   * Effectively clears all cache entries that were stored with any of the provided tags.
   *
   * @param tags - List of tags to be flushed.
   * @returns Resolves when the tag invalidation completes.
   * @throws {Error} If the storage backend fails to process the tag flush.
   */
  flushTags(tags: readonly string[]): Promise<void>

  /**
   * Compute a namespaced key based on tags.
   *
   * Generates a unique internal key that incorporates tag versioning to ensure
   * proper isolation and invalidation.
   *
   * @param key - Original user-provided cache key.
   * @param tags - Tags to associate with the key.
   * @returns A derived key string used for actual storage.
   */
  tagKey(key: string, tags: readonly string[]): string

  /**
   * Register a key in the tag index.
   *
   * Maintains the relationship between tags and their associated keys for tracking.
   *
   * @param tags - Tags to index the key under.
   * @param taggedKey - The derived key to be indexed.
   * @returns Resolves when the indexing completes.
   */
  tagIndexAdd(tags: readonly string[], taggedKey: string): void | Promise<void>

  /**
   * Unregister a key from all tag indexes.
   *
   * Removes the tracking information for a specific derived key.
   *
   * @param taggedKey - The derived key to remove from indexes.
   * @returns Resolves when the removal completes.
   */
  tagIndexRemove(taggedKey: string): void | Promise<void>
}

/**
 * Validates if a cache store supports tagging operations.
 *
 * Performs a runtime check to determine if the provided store implements the `TaggableStore` interface.
 *
 * @param store - The cache store instance to evaluate.
 * @returns True if the store supports tagging, false otherwise.
 *
 * @example
 * ```typescript
 * if (isTaggableStore(myStore)) {
 *   await myStore.flushTags(['users', 'posts']);
 * }
 * ```
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
