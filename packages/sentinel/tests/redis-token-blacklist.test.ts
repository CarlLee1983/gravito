import { describe, expect, it, mock } from 'bun:test'
import { RedisTokenBlacklist } from '../src/RedisTokenBlacklist'

describe('RedisTokenBlacklist', () => {
  it('should add a token to the blacklist with correct TTL', async () => {
    const redisMock = {
      set: mock(async () => 'OK'),
      get: mock(async () => null),
      exists: mock(async () => 0),
      del: mock(async () => 0),
    }

    const blacklist = new RedisTokenBlacklist(redisMock)
    const expiresAt = new Date(Date.now() + 60000) // 1 minute later

    await blacklist.add('token-123', expiresAt)

    expect(redisMock.set).toHaveBeenCalledTimes(1)
    const args = redisMock.set.mock.calls[0]
    expect(args[0]).toBe('sentinel:blacklist:token-123')
    expect(args[1]).toBe('revoked')
    expect(args[2]).toBe('PX')
    // TTL should be around 60000
    expect(args[3]).toBeGreaterThan(59000)
    expect(args[3]).toBeLessThanOrEqual(60000)
  })

  it('should not add a token if it is already expired', async () => {
    const redisMock = {
      set: mock(async () => 'OK'),
      get: mock(async () => null),
      exists: mock(async () => 0),
      del: mock(async () => 0),
    }

    const blacklist = new RedisTokenBlacklist(redisMock)
    const expiresAt = new Date(Date.now() - 1000) // Expired

    await blacklist.add('token-expired', expiresAt)

    expect(redisMock.set).not.toHaveBeenCalled()
  })

  it('should check if a token exists in the blacklist', async () => {
    const redisMock = {
      set: mock(async () => 'OK'),
      get: mock(async () => null),
      exists: mock(async () => 1), // Found
      del: mock(async () => 0),
    }

    const blacklist = new RedisTokenBlacklist(redisMock)
    const result = await blacklist.has('token-123')

    expect(result).toBe(true)
    expect(redisMock.exists).toHaveBeenCalledWith('sentinel:blacklist:token-123')
  })

  it('should return false if token does not exist', async () => {
    const redisMock = {
      set: mock(async () => 'OK'),
      get: mock(async () => null),
      exists: mock(async () => 0), // Not found
      del: mock(async () => 0),
    }

    const blacklist = new RedisTokenBlacklist(redisMock)
    const result = await blacklist.has('token-safe')

    expect(result).toBe(false)
  })

  it('prune should be a no-op', async () => {
    const redisMock = {
      set: mock(async () => 'OK'),
      get: mock(async () => null),
      exists: mock(async () => 0),
      del: mock(async () => 0),
    }

    const blacklist = new RedisTokenBlacklist(redisMock)
    await blacklist.prune()

    expect(redisMock.del).not.toHaveBeenCalled()
  })
})
