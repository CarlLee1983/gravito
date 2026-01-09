import { describe, expect, it, mock } from 'bun:test'
import { CallbackUserProvider } from '../src/providers/CallbackUserProvider'

describe('CallbackUserProvider', () => {
  it('uses callbacks for retrieval and validation', async () => {
    const provider = new CallbackUserProvider(
      async (id) => ({ id, getAuthIdentifier: () => id }),
      async (_user, creds) => creds.password === 'secret',
      async (id, token) => (token === 'ok' ? ({ id, getAuthIdentifier: () => id } as any) : null),
      async (credentials) =>
        credentials.email ? ({ id: '1', getAuthIdentifier: () => '1' } as any) : null
    )

    const user = await provider.retrieveById('1')
    expect(user?.getAuthIdentifier()).toBe('1')

    const tokenUser = await provider.retrieveByToken('1', 'ok')
    expect(tokenUser?.getAuthIdentifier()).toBe('1')

    const valid = await provider.validateCredentials(user as any, { password: 'secret' })
    expect(valid).toBe(true)
  })

  it('falls back when callbacks are missing', async () => {
    const originalLog = console.log
    console.log = mock(() => {})

    ;(global as any).MOCK_USERS = [{ id: 2, email: 'test@example.com' }]

    const provider = new CallbackUserProvider(
      async (id) => ({ id, getAuthIdentifier: () => id }),
      async () => true
    )

    const user = await provider.retrieveByCredentials({ email: 'test@example.com' })
    expect(user?.getAuthIdentifier()).toBe(2)

    const valid = await provider.validateCredentials(user as any, { password: 'ignored' })
    expect(valid).toBe(true)

    console.log = originalLog
  })

  it('handles missing token callback and remember token updates', async () => {
    const user = {
      rememberToken: '',
      setRememberToken(token: string) {
        this.rememberToken = token
      },
    }

    const provider = new CallbackUserProvider(
      async (id) => ({ id, getAuthIdentifier: () => id }) as any,
      async () => true
    )

    const tokenUser = await provider.retrieveByToken('1', 'token')
    expect(tokenUser).toBeNull()

    await provider.updateRememberToken(user as any, 'remember-me')
    expect(user.rememberToken).toBe('remember-me')
  })
})
