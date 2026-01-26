import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { type AuthConfig, AuthManager } from '../src/AuthManager'

describe('AuthManager Caching', () => {
  const mockConfig: AuthConfig = {
    defaults: {
      guard: 'web',
    },
    guards: {
      web: { driver: 'session', provider: 'users' },
      api: { driver: 'token', provider: 'users' },
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
    }) as unknown as GravitoContext

  it('caches guard instances', async () => {
    const ctx = createMockContext()
    const resolvers = new Map([['users', () => ({}) as any]])
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    const guard1 = manager.guard('web')
    const guard2 = manager.guard('web')

    expect(guard1).toBe(guard2)
  })

  it('resolves and caches default guard', async () => {
    const ctx = createMockContext()
    const resolvers = new Map([['users', () => ({}) as any]])
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    const guard1 = manager.guard()
    const guard2 = manager.guard('web')

    expect(guard1).toBe(guard2)
  })

  it('caches multiple different guards', async () => {
    const ctx = createMockContext()
    const resolvers = new Map([['users', () => ({}) as any]])
    const manager = new AuthManager(ctx, mockConfig, resolvers)

    const webGuard = manager.guard('web')
    const apiGuard = manager.guard('api')

    expect(webGuard).not.toBe(apiGuard)
    expect(manager.guard('web')).toBe(webGuard)
    expect(manager.guard('api')).toBe(apiGuard)
  })
})
