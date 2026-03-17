import { afterEach, describe, expect, it } from 'bun:test'
import type { GravitoContext } from '@gravito/photon'
import {
  authMiddleware,
  createSession,
  destroySession,
  isAuthEnabled,
  validateSession,
  verifyPassword,
} from '../src/server/middleware/auth'

function createContext(cookie?: string) {
  const headers = new Headers()
  if (cookie) {
    headers.set('cookie', cookie)
  }

  const responseHeaders = new Headers()

  return {
    req: {
      path: '/api/queues',
      raw: {
        headers,
      },
    },
    header(name: string, value: string) {
      responseHeaders.set(name, value)
    },
    json(payload: unknown, status = 200) {
      return new Response(JSON.stringify(payload), { status })
    },
    responseHeaders,
  } as unknown as GravitoContext & { responseHeaders: Headers }
}

describe('auth middleware', () => {
  const originalPassword = process.env.AUTH_PASSWORD

  afterEach(() => {
    if (originalPassword === undefined) {
      delete process.env.AUTH_PASSWORD
    } else {
      process.env.AUTH_PASSWORD = originalPassword
    }
  })

  it('should enable auth only when AUTH_PASSWORD is set', () => {
    delete process.env.AUTH_PASSWORD
    expect(isAuthEnabled()).toBe(false)

    process.env.AUTH_PASSWORD = 'secret'
    expect(isAuthEnabled()).toBe(true)
  })

  it('should verify passwords correctly', () => {
    process.env.AUTH_PASSWORD = 'secret'

    expect(verifyPassword('secret')).toBe(true)
    expect(verifyPassword('nope')).toBe(false)
    expect(verifyPassword('secret-with-suffix')).toBe(false)
  })

  it('should create and destroy sessions via cookies', () => {
    const context = createContext()
    const token = createSession(context)

    expect(validateSession(token)).toBe(true)

    const cookie = context.responseHeaders.get('Set-Cookie')
    expect(cookie).toContain('flux_session=')

    const destroyContext = createContext(cookie ?? undefined)
    destroySession(destroyContext)

    expect(validateSession(token)).toBe(false)
    expect(destroyContext.responseHeaders.get('Set-Cookie')).toContain('Max-Age=0')
  })

  it('should reject protected routes without a valid session', async () => {
    process.env.AUTH_PASSWORD = 'secret'
    const context = createContext()

    const response = await authMiddleware(context, async () => new Response('ok'))

    expect(response?.status).toBe(401)
  })

  it('should allow protected routes with a valid session', async () => {
    process.env.AUTH_PASSWORD = 'secret'
    const context = createContext()
    createSession(context)

    const cookie = context.responseHeaders.get('Set-Cookie') ?? undefined
    const authenticatedContext = createContext(cookie)

    const response = await authMiddleware(authenticatedContext, async () => new Response('ok'))

    expect(response?.status).toBe(200)
  })

  it('should always allow auth endpoints', async () => {
    process.env.AUTH_PASSWORD = 'secret'
    const context = createContext()
    context.req.path = '/api/auth/login'

    const response = await authMiddleware(context, async () => new Response('ok'))

    expect(response?.status).toBe(200)
  })
})
