import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { SessionGuard } from '../src/guards/SessionGuard'
import { TokenGuard } from '../src/guards/TokenGuard'

describe('Guards Additional Coverage', () => {
  const createMockContext = () =>
    ({
      get: mock(() => null),
      set: mock(() => {}),
      header: mock(() => {}),
      req: {
        header: mock(() => null),
        query: mock(() => null),
      },
    }) as unknown as GravitoContext

  it('SessionGuard check and guest', async () => {
    const provider = { retrieveById: async () => ({}) }
    const guard = new SessionGuard('web', provider as any, createMockContext())

    // @ts-expect-error
    guard.user = async () => ({})
    expect(await guard.check()).toBe(true)
    expect(await guard.guest()).toBe(false)

    // @ts-expect-error
    guard.user = async () => null
    expect(await guard.check()).toBe(false)
    expect(await guard.guest()).toBe(true)
  })

  it('SessionGuard validate', async () => {
    const provider = {
      retrieveByCredentials: mock(async () => ({})),
      validateCredentials: mock(async () => true),
    }
    const guard = new SessionGuard('web', provider as any, createMockContext())
    expect(await guard.validate({})).toBe(true)
    expect(provider.retrieveByCredentials).toHaveBeenCalled()
  })

  it('TokenGuard check and guest', async () => {
    const guard = new TokenGuard({} as any, createMockContext())
    // @ts-expect-error
    guard.user = async () => ({})
    expect(await guard.check()).toBe(true)
    expect(await guard.guest()).toBe(false)
  })

  it('TokenGuard validate', async () => {
    const provider = {
      retrieveByCredentials: mock(async () => ({})),
      validateCredentials: mock(async () => true),
    }
    const guard = new TokenGuard(provider as any, createMockContext())
    expect(await guard.validate({})).toBe(true)
  })

  it('TokenGuard setProvider and getToken fallback', async () => {
    const guard = new TokenGuard({} as any, createMockContext())
    const provider = {} as any
    guard.setProvider(provider)
    expect(guard.getProvider()).toBe(provider)

    // @ts-expect-error
    expect(guard.getTokenForRequest()).toBeNull()
  })
})
