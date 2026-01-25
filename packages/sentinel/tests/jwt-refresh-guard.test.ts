import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import type { UserProvider } from '../src/contracts/UserProvider'
import { JwtRefreshGuard } from '../src/guards/JwtRefreshGuard'

mock.module('@gravito/photon/jwt', () => ({
  sign: async (payload: any) => JSON.stringify(payload),
  verify: async (token: string) => {
    try {
      return JSON.parse(token)
    } catch {
      return null
    }
  },
}))

describe('JwtRefreshGuard', () => {
  const createMockProvider = (users: Record<string | number, any>) =>
    ({
      retrieveById: mock(async (id: string | number) => users[id] || null),
    }) as unknown as UserProvider<any>

  const createMockContext = () =>
    ({
      get: mock(() => null),
      set: mock(() => {}),
      req: {
        header: mock(() => null),
      },
    }) as unknown as GravitoContext

  it('creates a token pair', async () => {
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ 1: user })
    const ctx = createMockContext()
    const guard = new JwtRefreshGuard(provider, ctx, { secret: 'test' })

    const tokens = await guard.createTokenPair(user)

    expect(tokens.accessToken).toBeDefined()
    expect(tokens.refreshToken).toBeDefined()

    const accessPayload = JSON.parse(tokens.accessToken)
    expect(accessPayload.sub).toBe('1')
    expect(accessPayload.type).toBe('access')

    const refreshPayload = JSON.parse(tokens.refreshToken)
    expect(refreshPayload.sub).toBe('1')
    expect(refreshPayload.type).toBe('refresh')
  })

  it('refreshes tokens with a valid refresh token', async () => {
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ 1: user })
    const ctx = createMockContext()
    const guard = new JwtRefreshGuard(provider, ctx, { secret: 'test' })

    const refreshToken = JSON.stringify({ sub: '1', type: 'refresh' })
    const newTokens = await guard.refreshTokens(refreshToken)

    expect(newTokens).not.toBeNull()
    expect(newTokens?.accessToken).toBeDefined()
    expect(provider.retrieveById).toHaveBeenCalledWith('1')
  })

  it('rejects an invalid or wrong type refresh token', async () => {
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ 1: user })
    const ctx = createMockContext()
    const guard = new JwtRefreshGuard(provider, ctx, { secret: 'test' })

    const accessToken = JSON.stringify({ sub: '1', type: 'access' })
    const result = await guard.refreshTokens(accessToken)

    expect(result).toBeNull()
  })

  it('authenticates user via access token', async () => {
    const user = { id: 'user-123', getAuthIdentifier: () => 'user-123' }
    const provider = createMockProvider({ 'user-123': user })
    const accessToken = JSON.stringify({ sub: 'user-123', type: 'access' })
    const ctx = {
      req: {
        header: mock((name: string) => (name === 'Authorization' ? `Bearer ${accessToken}` : null)),
      },
    } as unknown as GravitoContext

    const guard = new JwtRefreshGuard(provider, ctx, { secret: 'test' })
    const authenticatedUser = await guard.user()

    expect(authenticatedUser).toBe(user)
    expect(await guard.id()).toBe('user-123')
    expect(await guard.check()).toBe(true)
  })

  it('handles guest status and manual user setting', async () => {
    const guard = new JwtRefreshGuard({} as any, createMockContext(), { secret: 'test' })
    expect(await guard.guest()).toBe(true)

    const user = { id: 1, getAuthIdentifier: () => 1 }
    guard.setUser(user as any)
    expect(await guard.user()).toBe(user as any)
    expect(await guard.guest()).toBe(false)
  })

  it('validates credentials via provider', async () => {
    const provider = {
      retrieveByCredentials: mock(async () => ({})),
      validateCredentials: mock(async () => true),
    }
    const guard = new JwtRefreshGuard(provider as any, createMockContext(), { secret: 'test' })
    expect(await guard.validate({})).toBe(true)
  })
})
