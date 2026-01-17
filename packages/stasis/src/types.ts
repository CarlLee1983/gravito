/**
 * Represents a unique identifier for a cached item.
 *
 * @public
 * @since 3.0.0
 */
export type CacheKey = string

/**
 * Time-to-live (TTL) configuration for cache entries.
 *
 * - `number`: Seconds from now.
 * - `Date`: Absolute expiry time.
 * - `null`: Cache forever.
 * - `undefined`: Use the store/repository default.
 *
 * @public
 * @since 3.0.0
 */
export type CacheTtl = number | Date | null | undefined

/**
 * Result of a cache retrieval.
 * Returns the value of type `T` or `null` if not found or expired.
 *
 * @public
 * @since 3.0.0
 */
export type CacheValue<T = unknown> = T | null

/**
 * Normalize a cache key to ensure it is valid.
 *
 * @param key - The raw cache key.
 * @returns The normalized cache key.
 * @throws {Error} If the key is empty.
 *
 * @public
 * @since 3.0.0
 */
export function normalizeCacheKey(key: string): string {
  if (!key) {
    throw new Error('Cache key cannot be empty.')
  }
  return key
}

/**
 * Convert a CacheTtl value to an absolute epoch timestamp.
 *
 * @param ttl - The TTL value to convert.
 * @param now - Optional current timestamp in milliseconds.
 * @returns The expiration timestamp in milliseconds, null for forever, or undefined.
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
 * Determine if a specific expiration timestamp has passed.
 *
 * @param expiresAt - The expiration timestamp in milliseconds (or null for forever).
 * @param now - Optional current timestamp in milliseconds.
 * @returns `true` if expired, `false` otherwise.
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
  return now > expiresAt
}
