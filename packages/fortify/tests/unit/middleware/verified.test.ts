import { beforeAll, describe, expect, it } from 'bun:test'
import { createMockContext, createMockNext } from '../../helpers'

let verified: typeof import('../../../src/middleware/verified').verified

beforeAll(async () => {
  ;({ verified } = await import('../../../src/middleware/verified'))
})

describe('verified middleware', () => {
  it('should return 500 when auth service is not available', async () => {
    const context = createMockContext()
    const next = createMockNext()

    const mockContextWithoutAuth = {
      ...context,
      get: (key: string) => (key === 'auth' ? null : (context as any).get(key)),
    }

    const result = await verified(mockContextWithoutAuth as any, next)

    expect(result).toBeDefined()
    expect((result as any).status).toBe(500)
    expect((result as any).body).toEqual({
      error: 'Authentication service not available',
    })
    expect((next as any).wasCalled()).toBe(false)
  })

  it('should redirect to /login when user is not authenticated', async () => {
    const context = createMockContext({ user: null })
    const next = createMockNext()

    const result = await verified(context as any, next)

    expect(result).toBeDefined()
    expect((result as any).status).toBe(302)
    expect((result as any).headers.get('location')).toBe('/login')
    expect((next as any).wasCalled()).toBe(false)
  })

  it('should redirect to /verify-email when user email is not verified (HTML request)', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      email_verified_at: null,
    }
    const context = createMockContext({
      user,
      headers: { accept: 'text/html' },
    })
    const next = createMockNext()

    const result = await verified(context as any, next)

    expect(result).toBeDefined()
    expect((result as any).status).toBe(302)
    expect((result as any).headers.get('location')).toBe('/verify-email')
    expect((next as any).wasCalled()).toBe(false)
  })

  it('should return 403 JSON when user email is not verified (JSON request)', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      email_verified_at: null,
    }
    const context = createMockContext({
      user,
      headers: { accept: 'application/json' },
    })
    const next = createMockNext()

    const result = await verified(context as any, next)

    expect(result).toBeDefined()
    expect((result as any).status).toBe(403)
    expect((result as any).body).toEqual({ error: 'Email not verified' })
    expect((next as any).wasCalled()).toBe(false)
  })

  it('should call next() when user is verified', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      email_verified_at: new Date(),
    }
    const context = createMockContext({ user })
    const next = createMockNext()

    const result = await verified(context as any, next)

    expect(result).toBeUndefined()
    expect((next as any).wasCalled()).toBe(true)
  })

  it('should handle missing Accept header gracefully', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      email_verified_at: null,
    }
    const context = createMockContext({
      user,
      headers: {},
    })
    const next = createMockNext()

    const result = await verified(context as any, next)

    expect(result).toBeDefined()
    expect((result as any).status).toBe(302)
    expect((result as any).headers.get('location')).toBe('/verify-email')
  })

  it('should detect JSON request from Accept header variants', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      email_verified_at: null,
    }

    const jsonAcceptHeaders = [
      'application/json',
      'application/json, text/html',
      'text/html, application/json',
    ]

    for (const acceptHeader of jsonAcceptHeaders) {
      const context = createMockContext({
        user,
        headers: { Accept: acceptHeader },
      })
      const next = createMockNext()

      const result = await verified(context as any, next)

      expect(result).toBeDefined()
      expect((result as any).status).toBe(403)
      expect((result as any).body).toEqual({ error: 'Email not verified' })
    }
  })
})
