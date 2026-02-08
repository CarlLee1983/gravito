import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../src/contracts/Authenticatable'
import type { UserProvider } from '../src/contracts/UserProvider'
import { SessionGuard } from '../src/guards/SessionGuard'

// Mock User Implementation
class MockUser implements Authenticatable {
  constructor(
    public id: string,
    public tenantId?: string
  ) {}
  getAuthIdentifier() {
    return this.id
  }
  getTenantId() {
    return this.tenantId
  }
}

// Mock Provider
const mockProvider = {
  retrieveById: mock(async (id: string) => {
    if (id === 'user-1') {
      return new MockUser('user-1', 'tenant-A')
    }
    if (id === 'user-2') {
      return new MockUser('user-2', 'tenant-B')
    }
    if (id === 'user-no-tenant') {
      return new MockUser('user-no-tenant') // Global user
    }
    return null
  }),
  retrieveByCredentials: mock(async () => null),
  validateCredentials: mock(async () => true),
} as unknown as UserProvider

describe('SessionGuard Multi-Tenancy', () => {
  it('should allow access if tenantId matches', async () => {
    const ctx = {
      get: mock((key: string) => {
        if (key === 'session') {
          return { get: () => 'user-1' }
        }
        if (key === 'tenantId') {
          return 'tenant-A'
        }
        return undefined
      }),
    } as unknown as GravitoContext

    const guard = new SessionGuard('web', mockProvider, ctx)
    const user = await guard.user()

    expect(user).not.toBeNull()
    expect(user?.getAuthIdentifier()).toBe('user-1')
  })

  it('should deny access if tenantId does not match', async () => {
    const ctx = {
      get: mock((key: string) => {
        if (key === 'session') {
          return { get: () => 'user-1' } // Belongs to tenant-A
        }
        if (key === 'tenantId') {
          return 'tenant-B' // Requesting tenant-B
        }
        return undefined
      }),
    } as unknown as GravitoContext

    const guard = new SessionGuard('web', mockProvider, ctx)
    const user = await guard.user()

    expect(user).toBeNull() // Should be blocked
  })

  it('should allow access if context has no tenantId (Global Context)', async () => {
    const ctx = {
      get: mock((key: string) => {
        if (key === 'session') {
          return { get: () => 'user-1' } // Belongs to tenant-A
        }
        if (key === 'tenantId') {
          return undefined // No tenant context
        }
        return undefined
      }),
    } as unknown as GravitoContext

    const guard = new SessionGuard('web', mockProvider, ctx)
    const user = await guard.user()

    expect(user).not.toBeNull()
    expect(user?.getAuthIdentifier()).toBe('user-1')
  })

  it('should allow access if user has no tenantId (Global User)', async () => {
    const ctx = {
      get: mock((key: string) => {
        if (key === 'session') {
          return { get: () => 'user-no-tenant' }
        }
        if (key === 'tenantId') {
          return 'tenant-A'
        }
        return undefined
      }),
    } as unknown as GravitoContext

    const guard = new SessionGuard('web', mockProvider, ctx)
    const user = await guard.user()

    expect(user).not.toBeNull()
    expect(user?.getAuthIdentifier()).toBe('user-no-tenant')
  })
})
