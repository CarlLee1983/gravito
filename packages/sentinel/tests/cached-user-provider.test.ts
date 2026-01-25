import { describe, expect, it, mock } from 'bun:test'
import type { Authenticatable } from '../src/contracts/Authenticatable'
import type { UserProvider } from '../src/contracts/UserProvider'
import { CachedUserProvider } from '../src/providers/CachedUserProvider'

describe('CachedUserProvider', () => {
  const createMockProvider = () =>
    ({
      retrieveById: mock(
        async (id: string | number) => ({ id, getAuthIdentifier: () => id }) as Authenticatable
      ),
      retrieveByToken: mock(async () => null),
      retrieveByCredentials: mock(async () => null),
      validateCredentials: mock(async () => true),
      updateRememberToken: mock(async () => {}),
    }) as unknown as UserProvider<Authenticatable>

  it('caches retrieveById calls', async () => {
    const inner = createMockProvider()
    const provider = new CachedUserProvider(inner)

    const user1 = await provider.retrieveById(1)
    const user2 = await provider.retrieveById(1)

    expect(user1).toBe(user2)
    expect(inner.retrieveById).toHaveBeenCalledTimes(1)
  })

  it('expires cache after TTL', async () => {
    const inner = createMockProvider()
    const provider = new CachedUserProvider(inner, { ttlSeconds: -1 })

    await provider.retrieveById(1)
    await provider.retrieveById(1)

    expect(inner.retrieveById).toHaveBeenCalledTimes(2)
  })

  it('invalidates cache', async () => {
    const inner = createMockProvider()
    const provider = new CachedUserProvider(inner)

    await provider.retrieveById(1)
    provider.invalidate(1)
    await provider.retrieveById(1)

    expect(inner.retrieveById).toHaveBeenCalledTimes(2)
  })

  it('evicts oldest entry when maxSize is reached (LRU)', async () => {
    const inner = createMockProvider()
    const provider = new CachedUserProvider(inner, { maxSize: 2 })

    await provider.retrieveById(1)
    await provider.retrieveById(2)
    await provider.retrieveById(3)

    await provider.retrieveById(1)

    expect(inner.retrieveById).toHaveBeenCalledTimes(4)
  })
})
