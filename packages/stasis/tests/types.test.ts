import { describe, expect, it } from 'bun:test'
import { isExpired, normalizeCacheKey, ttlToExpiresAt } from '../src/types'

describe('types helpers', () => {
  it('normalizes cache keys', () => {
    expect(() => normalizeCacheKey('')).toThrow('Cache key cannot be empty.')
    expect(normalizeCacheKey('ok')).toBe('ok')
  })

  it('converts ttl to expiresAt and checks expiry', () => {
    const now = Date.now()
    const expiresAt = ttlToExpiresAt(1, now)
    expect(typeof expiresAt).toBe('number')
    expect(expiresAt).toBe(now + 1000)

    const immediate = ttlToExpiresAt(0, now)
    expect(immediate).toBe(now)

    const fixed = new Date(now + 5000)
    expect(ttlToExpiresAt(fixed, now)).toBe(fixed.getTime())
    expect(ttlToExpiresAt(null, now)).toBeNull()
    expect(ttlToExpiresAt(undefined, now)).toBeUndefined()

    expect(isExpired(null, now)).toBe(false)
    expect(isExpired(undefined, now)).toBe(false)
    expect(isExpired(now - 1, now)).toBe(true)
  })
})
