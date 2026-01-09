import { describe, expect, it } from 'bun:test'
import type { Context } from '@gravito/photon'
import type { Authenticatable } from '../src/contracts/Authenticatable'
import { TokenGuard } from '../src/guards/TokenGuard'
import { CallbackUserProvider } from '../src/providers/CallbackUserProvider'

class TestUser implements Authenticatable {
  constructor(
    public id: string,
    public token: string
  ) {}
  getAuthIdentifier() {
    return this.id
  }
}

describe('TokenGuard', () => {
  it('should authenticate with query token', async () => {
    const provider = new CallbackUserProvider(
      async (id) => new TestUser(String(id), 'valid-token'),
      async () => true,
      async () => null,
      async (creds) => (creds.api_token === 'valid-token' ? new TestUser('1', 'valid-token') : null)
    )

    const req = new Request('http://localhost/?api_token=valid-token')
    const ctx = {
      req: {
        query: (key: string) => {
          const url = new URL(req.url)
          return url.searchParams.get(key)
        },
        header: () => undefined,
      },
    } as unknown as Context

    const guard = new TokenGuard(provider, ctx, 'api_token', 'api_token', false, true)

    expect(await guard.check()).toBe(true)
    expect((await guard.user())?.getAuthIdentifier()).toBe('1')
  })

  it('should authenticate with bearer token', async () => {
    const provider = new CallbackUserProvider(
      async () => null,
      async () => true,
      async () => null,
      async (creds) => (creds.api_token === 'valid-token' ? new TestUser('1', 'valid-token') : null)
    )

    const _req = new Request('http://localhost/')
    const ctx = {
      req: {
        query: () => undefined,
        header: (key: string) => (key === 'Authorization' ? 'Bearer valid-token' : undefined),
      },
    } as unknown as Context

    const guard = new TokenGuard(provider, ctx)

    expect(await guard.check()).toBe(true)
  })

  it('should fail with invalid token', async () => {
    const provider = new CallbackUserProvider(
      async () => null,
      async () => true,
      async () => null,
      async () => null
    )

    const ctx = {
      req: {
        query: () => 'invalid',
        header: () => undefined,
      },
    } as unknown as Context

    const guard = new TokenGuard(provider, ctx)

    expect(await guard.check()).toBe(false)
  })
})
