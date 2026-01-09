import { describe, expect, it, mock } from 'bun:test'

const { JwtGuard } = await import('../src/guards/JwtGuard')
const { SessionGuard } = await import('../src/guards/SessionGuard')
const { TokenGuard } = await import('../src/guards/TokenGuard')

describe('SessionGuard', () => {
  it('logs in and logs out users', async () => {
    const session = new Map<string, unknown>()
    const ctx = {
      get: () => ({
        get: (key: string) => session.get(key),
        put: (key: string, value: unknown) => session.set(key, value),
        forget: (key: string) => session.delete(key),
        regenerate: mock(() => {}),
      }),
      set: mock(() => {}),
    }

    const provider = {
      retrieveById: async (id: string) => ({ getAuthIdentifier: () => id }),
      retrieveByCredentials: async () => ({ getAuthIdentifier: () => '1' }),
      validateCredentials: async () => true,
    }

    const guard = new SessionGuard('web', provider as any, ctx as any, 'auth')
    const loggedIn = await guard.attempt({ email: 'test' })
    expect(loggedIn).toBe(true)

    expect(await guard.check()).toBe(true)
    await guard.logout()
    expect(await guard.check()).toBe(false)
  })

  it('returns null when logged out or session is missing', async () => {
    const ctx = {
      get: () => ({
        get: () => null,
        put: () => {},
        forget: () => {},
        regenerate: mock(() => {}),
      }),
      set: mock(() => {}),
    }

    const provider = {
      retrieveById: async () => null,
      retrieveByCredentials: async () => null,
      validateCredentials: async () => false,
    }

    const guard = new SessionGuard('web', provider as any, ctx as any, 'auth')
    expect(await guard.user()).toBeNull()
    await guard.logout()
    expect(await guard.id()).toBeNull()
  })
})

describe('TokenGuard', () => {
  it('resolves tokens from query and header', async () => {
    const ctx = {
      req: {
        query: (key: string) => (key === 'api_token' ? 'query-token' : null),
        header: () => null,
      },
    }
    const provider = {
      retrieveByCredentials: async (creds: Record<string, unknown>) =>
        creds.api_token ? { getAuthIdentifier: () => '1' } : null,
      validateCredentials: async () => true,
    }

    const guard = new TokenGuard(provider as any, ctx as any, 'api_token', 'api_token', false, true)
    expect(await guard.user()).toBeDefined()

    const ctx2 = {
      req: {
        query: () => null,
        header: () => 'Bearer header-token',
      },
    }
    const guard2 = new TokenGuard(provider as any, ctx2 as any)
    await guard2.user()
    expect(await guard2.id()).toBe('1')
  })

  it('ignores query tokens when disabled and fails validation without validator', async () => {
    const ctx = {
      req: {
        query: () => 'query-token',
        header: () => null,
      },
    }
    const provider = {
      retrieveByCredentials: async () => ({ getAuthIdentifier: () => '1' }),
    }

    const guard = new TokenGuard(
      provider as any,
      ctx as any,
      'api_token',
      'api_token',
      false,
      false
    )
    expect(await guard.user()).toBeNull()
    expect(await guard.validate({ api_token: 'query-token' })).toBe(false)
  })
})

describe('JwtGuard', () => {
  it('verifies bearer tokens and resolves users', async () => {
    const ctx = {
      req: {
        header: () => 'Bearer jwt-token',
        query: () => null,
      },
    }
    const provider = {
      retrieveById: async (id: string) => ({ getAuthIdentifier: () => id }),
      retrieveByCredentials: async () => ({ getAuthIdentifier: () => '1' }),
      validateCredentials: async () => true,
    }

    const guard = new JwtGuard(provider as any, ctx as any, 'secret', 'HS256', false, {
      verify: async (_token: string) => ({ sub: 'user-1' }),
    })
    expect(await guard.user()).toBeDefined()
    expect(await guard.id()).toBe('user-1')
  })

  it('resolves tokens from query when enabled', async () => {
    const ctx = {
      req: {
        header: () => null,
        query: (key: string) => (key === 'token' ? 'query-token' : null),
      },
    }
    const provider = {
      retrieveById: async (id: string) => ({ getAuthIdentifier: () => id }),
      retrieveByCredentials: async () => ({ getAuthIdentifier: () => '1' }),
      validateCredentials: async () => true,
    }

    const guard = new JwtGuard(provider as any, ctx as any, 'secret', 'HS256', true)
    expect(await guard.user()).toBeDefined()
  })
})
