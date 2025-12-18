export type CacheKey = string

/**
 * Laravel-like TTL:
 * - `number` = seconds from now
 * - `Date` = absolute expiry time
 * - `null` = forever
 * - `undefined` = store default / repository default (when applicable)
 */
export type CacheTtl = number | Date | null | undefined

export type CacheValue<T = unknown> = T | null

export function normalizeCacheKey(key: string): string {
  if (!key) {
    throw new Error('Cache key cannot be empty.')
  }
  return key
}

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

export function isExpired(expiresAt: number | null | undefined, now = Date.now()): boolean {
  if (expiresAt === null) {
    return false
  }
  if (expiresAt === undefined) {
    return false
  }
  return now > expiresAt
}
