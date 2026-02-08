import { describe, expect, it, mock } from 'bun:test'
import { AuthorizationException } from '@gravito/core'
import { permission } from '../src/middleware/permission'
import { role } from '../src/middleware/role'

describe('RBAC Middleware', () => {
  describe('role middleware', () => {
    it('allows access when user has the role', async () => {
      const user = {
        getAuthIdentifier: () => '1',
        hasRole: async (r: string) => r === 'admin',
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = role('admin')
      await middleware(ctx as any, next)

      expect(next).toHaveBeenCalled()
    })

    it('denies access when user does not have the role', async () => {
      const user = {
        getAuthIdentifier: () => '1',
        hasRole: async (r: string) => r === 'admin',
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = role('editor')

      // Should throw AuthorizationException
      try {
        await middleware(ctx as any, next)
        expect(true).toBe(false) // Should not reach here
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationException)
      }

      expect(next).not.toHaveBeenCalled()
    })

    it('denies access when user model lacks hasRole method', async () => {
      const user = {
        getAuthIdentifier: () => '1',
        // No hasRole method
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = role('admin')

      try {
        await middleware(ctx as any, next)
        expect(true).toBe(false)
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationException)
        expect((e as Error).message).toContain("implement 'hasRole'")
      }
    })

    it('denies access when unauthenticated', async () => {
      const auth = {
        user: async () => null,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = role('admin')

      try {
        await middleware(ctx as any, next)
        expect(true).toBe(false)
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationException)
        expect((e as Error).message).toBe('Unauthenticated.')
      }
    })
  })

  describe('permission middleware', () => {
    it('allows access when user has the permission', async () => {
      const user = {
        getAuthIdentifier: () => '1',
        hasPermission: async (p: string) => p === 'create-post',
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = permission('create-post')
      await middleware(ctx as any, next)

      expect(next).toHaveBeenCalled()
    })

    it('denies access when user does not have the permission', async () => {
      const user = {
        getAuthIdentifier: () => '1',
        hasPermission: async (p: string) => p === 'create-post',
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = permission('delete-post')

      try {
        await middleware(ctx as any, next)
        expect(true).toBe(false)
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationException)
      }
    })

    it('denies access when user model lacks hasPermission method', async () => {
      const user = {
        getAuthIdentifier: () => '1',
      }
      const auth = {
        user: async () => user,
      }
      const ctx = {
        get: (key: string) => (key === 'auth' ? auth : null),
      }
      const next = mock(async () => {})

      const middleware = permission('create-post')

      try {
        await middleware(ctx as any, next)
        expect(true).toBe(false)
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationException)
        expect((e as Error).message).toContain("implement 'hasPermission'")
      }
    })
  })
})
