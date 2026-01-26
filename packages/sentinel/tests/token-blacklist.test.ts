import { describe, expect, it } from 'bun:test'
import { InMemoryTokenBlacklist } from '../src/TokenBlacklist'

describe('TokenBlacklist', () => {
  it('adds and detects blacklisted tokens', async () => {
    const blacklist = new InMemoryTokenBlacklist()
    const expiresAt = new Date(Date.now() + 1000)

    await blacklist.add('jti-1', expiresAt)

    expect(await blacklist.has('jti-1')).toBe(true)
    expect(await blacklist.has('jti-2')).toBe(false)
  })

  it('detects expired blacklist entries as not present', async () => {
    const blacklist = new InMemoryTokenBlacklist()
    const expiresAt = new Date(Date.now() - 1000)

    await blacklist.add('jti-1', expiresAt)

    expect(await blacklist.has('jti-1')).toBe(false)
  })

  it('prunes expired entries', async () => {
    const blacklist = new InMemoryTokenBlacklist()

    await blacklist.add('valid', new Date(Date.now() + 1000))
    await blacklist.add('expired', new Date(Date.now() - 1000))

    await blacklist.prune()

    expect(await blacklist.has('expired')).toBe(false)
    expect(await blacklist.has('valid')).toBe(true)
  })
})
