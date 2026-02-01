import type { CacheStore } from '../store'
import type { CacheKey, CacheTtl, CacheValue } from '../types'

/**
 * A "black-hole" cache implementation that discards all data.
 *
 * NullStore implements the `CacheStore` interface but performs no actual storage
 * or retrieval operations. It is primarily used to disable caching globally
 * without changing application logic, or as a mock in testing environments.
 *
 * @example
 * ```typescript
 * const store = new NullStore();
 * await store.put('key', 'value', 60);
 * const value = await store.get('key'); // always returns null
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class NullStore implements CacheStore {
  /**
   * Simulates a cache miss for any given key.
   *
   * @param _key - Identifier for the cached item.
   * @returns Always `null` regardless of requested key.
   *
   * @example
   * ```typescript
   * const value = await store.get('my-key');
   * ```
   */
  async get<T = unknown>(_key: CacheKey): Promise<CacheValue<T>> {
    return null
  }

  /**
   * Discards the provided value instead of storing it.
   *
   * @param _key - The identifier for the item.
   * @param _value - The data to be cached.
   * @param _ttl - Time-to-live in seconds.
   * @returns Resolves immediately after discarding the data.
   *
   * @example
   * ```typescript
   * await store.put('user:1', { id: 1 }, 3600);
   * ```
   */
  async put(_key: CacheKey, _value: unknown, _ttl: CacheTtl): Promise<void> {
    // no-op
  }

  /**
   * Simulates a failed attempt to add an item to the cache.
   *
   * Since NullStore does not store data, this method always indicates that
   * the item was not added.
   *
   * @param _key - The identifier for the item.
   * @param _value - The data to be cached.
   * @param _ttl - Time-to-live in seconds.
   * @returns Always returns `false`.
   *
   * @example
   * ```typescript
   * const added = await store.add('key', 'value', 60); // false
   * ```
   */
  async add(_key: CacheKey, _value: unknown, _ttl: CacheTtl): Promise<boolean> {
    return false
  }

  /**
   * Simulates a failed attempt to remove an item from the cache.
   *
   * Since no data is ever stored, there is nothing to remove.
   *
   * @param _key - The identifier for the item to remove.
   * @returns Always returns `false`.
   *
   * @example
   * ```typescript
   * const forgotten = await store.forget('key'); // false
   * ```
   */
  async forget(_key: CacheKey): Promise<boolean> {
    return false
  }

  /**
   * Performs a no-op flush operation.
   *
   * @returns Resolves immediately as there is no data to clear.
   *
   * @example
   * ```typescript
   * await store.flush();
   * ```
   */
  async flush(): Promise<void> {
    // no-op
  }

  /**
   * Simulates an increment operation on a non-existent key.
   *
   * @param _key - The identifier for the numeric item.
   * @param _value - The amount to increment by.
   * @returns Always returns `0`.
   *
   * @example
   * ```typescript
   * const newValue = await store.increment('counter', 1); // 0
   * ```
   */
  async increment(_key: CacheKey, _value = 1): Promise<number> {
    return 0
  }

  /**
   * Simulates a decrement operation on a non-existent key.
   *
   * @param _key - The identifier for the numeric item.
   * @param _value - The amount to decrement by.
   * @returns Always returns `0`.
   *
   * @example
   * ```typescript
   * const newValue = await store.decrement('counter', 1); // 0
   * ```
   */
  async decrement(_key: CacheKey, _value = 1): Promise<number> {
    return 0
  }
}
