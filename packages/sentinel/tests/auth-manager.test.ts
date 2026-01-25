import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { AuthenticationException } from '@gravito/core'
import { type AuthConfig, AuthManager } from '../src/AuthManager'

describe('AuthManager Coverage', () => {
  const mockConfig: AuthConfig = {
    defaults: {
      guard: 'web',
      passwords: 'users',
    },
    guards: {
      web: { driver: 'session', provider: 'users' },
      api: { driver: 'token', provider: 'users' },
      jwt: { driver: 'jwt', provider: 'users', secret: 'test' },
      custom: { driver: 'custom_driver', provider: 'users' },
    },
    providers: {
      users: { driver: 'callback' },
    },
  }

  const createMockContext = () =>
    ({
      get: mock((key: string) => {
        if (key === 'session') return { get: () => null, put: () => {}, forget: () => {} }
        return null
      }),
      set: mock(() => {}),
      header: mock(() => {}),
      req: {
        header: mock(() => null),
        query: mock(() => null),
      },
    }) as unknown as GravitoContext

  const resolvers = new Map([
    [
      'users',
      () =>
        ({
          retrieveById: async (id: any) => ({ id, getAuthIdentifier: () => id }),
          retrieveByCredentials: async (creds: any) =>
            creds.email === 'test' ? { id: 1, getAuthIdentifier: () => 1 } : null,
          validateCredentials: async () => true,
        }) as any,
    ],
  ])

  it('provides id of authenticated user', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    // @ts-expect-error
    ctx.get.mockImplementation((key) => {
      if (key === 'session') return { get: () => 1 }
      return null
    })

    expect(await manager.id()).toBe(1)
  })

  it('checks authentication status', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    expect(await manager.check()).toBe(false)
  })

  it('authenticates user or throws', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    try {
      await manager.authenticate()
      expect().fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthenticationException)
    }
  })

  it('logs in and logs out user', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)
    const user = { getAuthIdentifier: () => 1 }

    await manager.login(user as any)
    expect(await manager.check()).toBe(true)

    await manager.logout()
    expect(await manager.check()).toBe(false)
  })

  it('supports custom guard drivers', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)
    const customGuard = { user: async () => null }

    manager.extend('custom_driver', () => customGuard as any)

    expect(manager.guard('custom')).toBe(customGuard as any)
  })

  it('supports custom provider drivers', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)
    const customProvider = { retrieveById: async () => null }

    manager.provider('custom_p', () => customProvider as any)

    const configWithCustom = {
      ...mockConfig,
      providers: { custom: { driver: 'custom_p' } },
    }
    const manager2 = new AuthManager(ctx, configWithCustom)
    manager2.provider('custom_p', () => customProvider as any)

    expect(manager2.createUserProvider('custom')).toBe(customProvider as any)
  })

  it('throws error for undefined guard', () => {
    const manager = new AuthManager({} as any, mockConfig)
    expect(() => manager.guard('non-existent')).toThrow()
  })

  it('resolves and creates various guards', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    expect(manager.guard('api')).toBeDefined()
    expect(manager.guard('jwt')).toBeDefined()
  })

  it('provides the user instance directly', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)
    const user = { id: 1 }

    manager.guard().setUser(user as any)
    expect(await manager.user()).toBe(user as any)
  })

  it('attempts login via default guard', async () => {
    const ctx = createMockContext()
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    const success = await manager.attempt({ email: 'test' })
    expect(success).toBe(true)
  })
})
