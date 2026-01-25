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
})
