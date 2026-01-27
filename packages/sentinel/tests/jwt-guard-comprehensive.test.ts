import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../src/contracts/Authenticatable'
import type { UserProvider } from '../src/contracts/UserProvider'
import { JwtGuard } from '../src/guards/JwtGuard'

// Mock User
const mockUser = {
  getAuthIdentifier: () => '123',
  id: '123',
} as unknown as Authenticatable

// Mock Provider
const createMockProvider = () =>
  ({
    retrieveById: mock().mockResolvedValue(mockUser),
    retrieveByToken: mock().mockResolvedValue(null),
    updateRememberToken: mock().mockResolvedValue(undefined),
    retrieveByCredentials: mock().mockResolvedValue(mockUser),
    validateCredentials: mock().mockResolvedValue(true),
  }) as unknown as UserProvider

// Mock Context
const createMockContext = (headerToken?: string, queryToken?: string) =>
  ({
    req: {
      header: (name: string) => (name === 'Authorization' ? headerToken : undefined),
      query: (name: string) => (name === 'token' ? queryToken : undefined),
    },
  }) as unknown as GravitoContext

// Mock Verify
const createMockVerify = (payload: any = { sub: '123' }) => mock().mockResolvedValue(payload)

describe('JwtGuard Comprehensive', () => {
  it('check() returns true when user is authenticated', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext('Bearer token')
    const verify = createMockVerify()

    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.check()).toBe(true)
  })

  it('check() returns false when token is missing', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext()
    const verify = createMockVerify()

    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.check()).toBe(false)
  })

  it('guest() returns opposite of check()', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext('Bearer token')
    const verify = createMockVerify()

    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.guest()).toBe(false)
  })

  it('id() returns user identifier', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext('Bearer token')
    const verify = createMockVerify()

    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.id()).toBe('123')
  })

  it('id() returns null when not authenticated', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext()
    const verify = createMockVerify()

    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.id()).toBeNull()
  })

  it('validate() validates credentials via provider', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext()
    const guard = new JwtGuard(provider, ctx, 'secret')

    const creds = { email: 'test@example.com', password: 'password' }
    expect(await guard.validate(creds)).toBe(true)
    expect(provider.retrieveByCredentials).toHaveBeenCalledWith(creds)
    expect(provider.validateCredentials).toHaveBeenCalledWith(mockUser, creds)
  })

  it('validate() returns false if user not found', async () => {
    const provider = createMockProvider()
    provider.retrieveByCredentials = mock().mockResolvedValue(null)
    const ctx = createMockContext()
    const guard = new JwtGuard(provider, ctx, 'secret')

    expect(await guard.validate({})).toBe(false)
  })

  it('setUser() sets the current user instance', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext()
    const guard = new JwtGuard(provider, ctx, 'secret')

    const newUser = { getAuthIdentifier: () => '999' } as Authenticatable
    guard.setUser(newUser)

    expect(await guard.user()).toBe(newUser)
    // Should skip token check
    expect(await guard.check()).toBe(true)
  })

  it('getProvider() and setProvider() manage provider instance', () => {
    const provider1 = createMockProvider()
    const provider2 = createMockProvider()
    const ctx = createMockContext()
    const guard = new JwtGuard(provider1, ctx, 'secret')

    expect(guard.getProvider()).toBe(provider1)
    guard.setProvider(provider2)
    expect(guard.getProvider()).toBe(provider2)
  })

  it('getTokenForRequest() handles query tokens when enabled', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext(undefined, 'query-token')
    const verify = createMockVerify()

    // Enable query token
    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', true, { verify })

    expect(await guard.user()).not.toBeNull()
    expect(verify).toHaveBeenCalledWith('query-token', 'secret', 'HS256')
  })

  it('getTokenForRequest() ignores query tokens when disabled', async () => {
    const provider = createMockProvider()
    const ctx = createMockContext(undefined, 'query-token')
    const verify = createMockVerify()

    // Disable query token (default)
    const guard = new JwtGuard(provider, ctx, 'secret', 'HS256', false, { verify })

    expect(await guard.user()).toBeNull()
    expect(verify).not.toHaveBeenCalled()
  })
})
