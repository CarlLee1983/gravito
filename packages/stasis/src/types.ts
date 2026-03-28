/**
 * Unique identifier for a cached item.
 *
 * Used to reference and retrieve specific data entries within the cache storage.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const key: CacheKey = 'user:123:profile';
 * ```
 */
import { StasisError } from './errors/StasisError'
import { StasisErrorCodes } from './errors/codes'

export type CacheKey = string

/**
 * Time-to-live (TTL) configuration for cache entries.
 *
 * Defines the duration or point in time when a cache entry becomes invalid.
 * - `number`: Relative duration in seconds from the current time.
 * - `Date`: Absolute point in time for expiration.
 * - `null`: Persistent storage that never expires automatically.
 * - `undefined`: Fallback to the default TTL configured in the store or repository.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const ttl: CacheTtl = 3600; // 1 hour
 * const absoluteTtl: CacheTtl = new Date('2026-12-31');
 * ```
 */
export type CacheTtl = number | Date | null | undefined

/**
 * Result of a cache retrieval operation.
 *
 * Represents the cached data of type `T`, or `null` if the entry is missing or has expired.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const val: CacheValue<string> = 'cached content';
 * const miss: CacheValue<number> = null;
 * ```
 */
export type CacheValue<T = unknown> = T | null

/**
 * Validates and prepares a cache key for storage operations.
 *
 * Ensures the key meets the minimum requirements for cache storage, such as being non-empty.
 *
 * @param key - The raw string to be used as a cache key.
 * @returns The validated cache key.
 * @throws {Error} Thrown if the provided key is an empty string or falsy.
 *
 * @example
 * ```typescript
 * const key = normalizeCacheKey('user_profile_123');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function normalizeCacheKey(key: string): string {
  if (!key) {
    throw new StasisError(400, StasisErrorCodes.EMPTY_CACHE_KEY, {
      message: 'Cache key cannot be empty.',
    })
  }
  return key
}

/**
 * Converts a flexible TTL definition into an absolute Unix epoch timestamp.
 *
 * Normalizes various TTL formats into a consistent millisecond-based timestamp
 * used for expiration checks.
 *
 * @param ttl - The TTL configuration to convert.
 * @param now - Reference timestamp in milliseconds for relative calculations. Defaults to current time.
 * @returns The expiration timestamp in milliseconds, `null` for permanent storage, or `undefined` for default behavior.
 *
 * @example
 * ```typescript
 * // Relative TTL (60 seconds)
 * const expiresAt = ttlToExpiresAt(60);
 *
 * // Absolute Date
 * const expiresAtDate = ttlToExpiresAt(new Date('2026-12-31'));
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function ttlToExpiresAt(ttl: CacheTtl, now = Date.now()): number | null | undefined {
  if (ttl === undefined) {
    return undefined
  }
  if (ttl === null) {
    return null
  }

  if (ttl instanceof Date) {
    return ttl.getTime()
  }

  if (typeof ttl === 'number') {
    // seconds
    if (ttl <= 0) {
      return now // immediate expiry semantics
    }
    return now + ttl * 1000
  }

  return undefined
}

/**
 * Evaluates whether a cache entry has exceeded its expiration time.
 *
 * Compares the provided expiration timestamp against a reference time to determine
 * if the cached data should be considered stale.
 *
 * @param expiresAt - The expiration timestamp in milliseconds, or `null`/`undefined` for non-expiring entries.
 * @param now - Reference timestamp in milliseconds for the comparison. Defaults to current time.
 * @returns `true` if the current time has passed the expiration point; otherwise `false`.
 *
 * @example
 * ```typescript
 * const expired = isExpired(Date.now() - 1000); // true
 * const persistent = isExpired(null); // false
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function isExpired(expiresAt: number | null | undefined, now = Date.now()): boolean {
  if (expiresAt === null) {
    return false
  }
  if (expiresAt === undefined) {
    return false
  }
  return now >= expiresAt
}

/**
 * Options for data compression within the cache.
 *
 * Defines how and when data should be compressed before storage to save space
 * and reduce I/O overhead.
 *
 * @public
 * @since 3.1.0
 *
 * @example
 * ```typescript
 * const options: CompressionOptions = {
 *   enabled: true,
 *   minSize: 2048,
 *   level: 9
 * };
 * ```
 */
export type CompressionOptions = {
  /**
   * Whether to enable compression for cached values.
   *
   * @defaultValue false
   */
  enabled: boolean

  /**
   * Minimum size in bytes for the value to be compressed.
   * Values smaller than this threshold will be stored uncompressed.
   *
   * @defaultValue 1024
   */
  minSize?: number

  /**
   * Compression level for zlib (1-9).
   * Higher levels provide better compression but require more CPU.
   *
   * @defaultValue 6
   */
  level?: number
}
