import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../src/contracts/Authenticatable'
import type { UserProvider } from '../src/contracts/UserProvider'
import { SessionGuard } from '../src/guards/SessionGuard'

describe('SessionGuard Remember Me', () => {
  const createMockUser = (id: string | number) => {
    let token = ''
    return {
      id,
      getAuthIdentifier: () => id,
      setRememberToken: mock((t: string) => {
        token = t
      }),
      getRememberToken: () => token,
    } as unknown as Authenticatable
  }

  const createMockProvider = (users: Record<string | number, any>) =>
    ({
      retrieveById: mock(async (id: string | number) => users[id] || null),
      retrieveByToken: mock(async (id: string | number, token: string) => {
        const user = users[id]
        if (user && user.getRememberToken() === token) {
          return user
        }
        return null
      }),
      updateRememberToken: mock(async () => {}),
    }) as unknown as UserProvider<any>

  const createMockContext = (sessionData: Record<string, any> = {}, cookies = '') => {
    const session = {
      get: mock((key: string) => sessionData[key]),
      put: mock((key: string, val: any) => {
        sessionData[key] = val
      }),
      forget: mock((key: string) => {
        delete sessionData[key]
      }),
      regenerate: mock(async () => {}),
    }
    return {
      get: mock((key: string) => (key === 'session' ? session : null)),
      set: mock(() => {}),
      header: mock(() => {}),
      req: {
        header: mock((name: string) => (name === 'Cookie' ? cookies : null)),
      },
    } as unknown as GravitoContext
  }

  it('sets remember cookie and token on login when remember is true', async () => {
    const user = createMockUser(1)
    const provider = createMockProvider({ 1: user })
    const ctx = createMockContext()
    const guard = new SessionGuard('web', provider, ctx)

    await guard.login(user, true)

    expect(user.setRememberToken).toHaveBeenCalled()
    expect(provider.updateRememberToken).toHaveBeenCalled()
  })

  it('retrieves user from remember cookie when session is empty', async () => {
    const user = createMockUser(1)
    const rememberToken = 'some-random-token'
    // @ts-expect-error
    user.setRememberToken(rememberToken)

    const provider = createMockProvider({ 1: user })
    const ctx = createMockContext({}, 'remember_token=1|some-random-token')
    const guard = new SessionGuard('web', provider, ctx)

    const retrievedUser = await guard.user()

    expect(retrievedUser).toBe(user)
  })

  it('retrieves user from remember cookie when session is empty', async () => {
    const user = createMockUser(1)
    const rememberToken = 'some-random-token'
    // @ts-expect-error
    user.setRememberToken(rememberToken)

    const provider = createMockProvider({ 1: user })
    // Cookie format: remember_token=1|some-random-token
    const ctx = createMockContext({}, 'remember_token=1|some-random-token')
    const guard = new SessionGuard('web', provider, ctx)

    const retrievedUser = await guard.user()

    expect(retrievedUser).toBe(user)
  })
})
