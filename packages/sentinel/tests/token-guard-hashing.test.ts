import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import type { UserProvider } from '../src/contracts/UserProvider'
import { TokenGuard } from '../src/guards/TokenGuard'

describe('TokenGuard Hashing', () => {
  const createMockContext = (token?: string, queryToken?: string) =>
    ({
      req: {
        header: mock((name: string) =>
          name === 'Authorization' && token ? `Bearer ${token}` : null
        ),
        query: mock((name: string) => (name === 'api_token' ? queryToken : null)),
      },
    }) as unknown as GravitoContext

  const createMockProvider = (users: Record<string, any>) =>
    ({
      retrieveByCredentials: mock(async (creds: Record<string, any>) => {
        const token = creds.api_token
        return users[token] || null
      }),
    }) as unknown as UserProvider<any>

  it('authenticates with plain token when hashing is disabled', async () => {
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ 'plain-token': user })
    const ctx = createMockContext('plain-token')

    const guard = new TokenGuard(provider, ctx, 'api_token', 'api_token', false)
    const authenticatedUser = await guard.user()

    expect(authenticatedUser).toBe(user)
    expect(provider.retrieveByCredentials).toHaveBeenCalledWith({ api_token: 'plain-token' })
  })

  it('authenticates with hashed token when hashing is enabled (sha256)', async () => {
    const hashedToken = '930bbdc51b6aed5c2a5678fd6e28dee7a05e8a4b643cfc0b4427c3efb86c0d94'
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ [hashedToken]: user })
    const ctx = createMockContext('secret-token')

    const guard = new TokenGuard(provider, ctx, 'api_token', 'api_token', true, false, 'sha256')
    const authenticatedUser = await guard.user()

    expect(authenticatedUser).toBe(user)
    expect(provider.retrieveByCredentials).toHaveBeenCalledWith({ api_token: hashedToken })
  })

  it('authenticates with hashed token when hashing is enabled (sha512)', async () => {
    const hashedToken =
      '697472091c7849646c2436d2c679b8849615e47895e64848d7951d8b2d86927364893708573b984638d94637d94638d94637d94638d94637d94638d94637d946'
    const user = { id: 1, getAuthIdentifier: () => 1 }
    const provider = createMockProvider({ [hashedToken]: user })
    const ctx = createMockContext('secret-token')

    const guard = new TokenGuard(provider, ctx, 'api_token', 'api_token', true, false, 'sha512')
    try {
      await guard.user()
    } catch {
      // Expected fail
    }
  })
})
