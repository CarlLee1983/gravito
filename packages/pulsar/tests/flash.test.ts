import { describe, expect, it, mock } from 'bun:test'
import { OrbitPulsar } from '../src'

type Middleware = (c: any, next: () => Promise<void>) => Promise<Response | undefined>

const createCore = () => {
  let middleware: Middleware | null = null
  const core = {
    config: {
      has: () => false,
      get: () => ({}),
    },
    adapter: {
      use: mock((_path: string, handler: Middleware) => {
        middleware = handler
      }),
    },
    get middleware() {
      return middleware
    },
  }
  return core
}

const createContext = (cookie?: string, method = 'GET') => {
  const store = new Map<string, unknown>()
  const setCookies: string[] = []
  const c = {
    req: {
      method,
      url: 'http://localhost/test',
      header: (name: string) => {
        if (name.toLowerCase() === 'cookie') {
          return cookie
        }
        return undefined
      },
    },
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    get: (key: string) => store.get(key),
    header: (name: string, value: string, options?: { append?: boolean }) => {
      if (name.toLowerCase() === 'set-cookie') {
        if (options?.append) {
          setCookies.push(value)
        } else {
          setCookies[0] = value
        }
      }
    },
    json: (body: unknown) => new Response(JSON.stringify(body), { status: 200 }),
    get setCookies() {
      return setCookies
    },
  }
  return c
}

const getCookieValue = (cookies: string[], name: string) => {
  for (const cookie of cookies) {
    const part = cookie.split(';')[0] ?? ''
    if (part.startsWith(`${name}=`)) {
      return part.slice(name.length + 1)
    }
  }
  return ''
}

describe('Session Flash Data', () => {
  it('should store flash data for next request', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!

    // First request: Set flash data
    const c1 = createContext()
    await middleware(c1, async () => {
      const session = c1.get('session')
      session.flash('success', 'Item created!')
    })
    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')
    expect(sessionCookie).toBeTruthy()

    // Second request: Get flash data
    const c2 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c2, async () => {
      const session = c2.get('session')
      const message = session.getFlash('success')
      expect(message).toBe('Item created!')
    })

    // Third request: Flash data should be gone
    const c3 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c3, async () => {
      const session = c3.get('session')
      const message = session.getFlash('success', 'default')
      expect(message).toBe('default')
    })
  })

  it('should clear flash data after read', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!
    const c1 = createContext()

    await middleware(c1, async () => {
      const session = c1.get('session')
      session.flash('message', 'Hello')
    })

    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')

    const c2 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c2, async () => {
      const session = c2.get('session')
      // Flash data should be available in the same request multiple times
      const first = session.getFlash('message')
      const second = session.getFlash('message')

      expect(first).toBe('Hello')
      expect(second).toBe('Hello') // Same value in same request
    })

    // Third request: Flash data should be gone after the previous request
    const c3 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c3, async () => {
      const session = c3.get('session')
      const message = session.getFlash('message', 'gone')
      expect(message).toBe('gone')
    })
  })

  it('should handle multiple flash keys', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!

    // First request: Set multiple flash messages
    const c1 = createContext()
    await middleware(c1, async () => {
      const session = c1.get('session')
      session.flash('success', 'Operation succeeded')
      session.flash('warning', 'Low disk space')
      session.flash('info', 'New update available')
    })
    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')

    // Second request: Get all flash messages
    const c2 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c2, async () => {
      const session = c2.get('session')
      expect(session.getFlash('success')).toBe('Operation succeeded')
      expect(session.getFlash('warning')).toBe('Low disk space')
      expect(session.getFlash('info')).toBe('New update available')
    })

    // Third request: All flash data should be gone
    const c3 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c3, async () => {
      const session = c3.get('session')
      expect(session.getFlash('success')).toBeUndefined()
      expect(session.getFlash('warning')).toBeUndefined()
      expect(session.getFlash('info')).toBeUndefined()
    })
  })

  it('should support keep() to preserve flash data', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!

    // First request: Set flash data
    const c1 = createContext()
    await middleware(c1, async () => {
      const session = c1.get('session')
      session.flash('keep-me', 'I should stay')
      session.flash('remove-me', 'I should go')
    })
    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')

    // Second request: Read flash and keep one
    const c2 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c2, async () => {
      const session = c2.get('session')
      const keepMe = session.getFlash('keep-me')
      const removeMe = session.getFlash('remove-me')

      expect(keepMe).toBe('I should stay')
      expect(removeMe).toBe('I should go')

      // Keep 'keep-me' for next request
      session.keep(['keep-me'])
    })

    // Third request: Verify kept flash is still there
    const c3 = createContext(`gravito_session=${sessionCookie}`)
    await middleware(c3, async () => {
      const session = c3.get('session')
      expect(session.getFlash('keep-me')).toBe('I should stay')
      expect(session.getFlash('remove-me', 'default')).toBe('default')
    })
  })

  it('should support default values for getFlash', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!
    const c = createContext()

    await middleware(c, async () => {
      const session = c.get('session')
      const message = session.getFlash('nonexistent', 'default value')
      expect(message).toBe('default value')
    })
  })

  it('should persist flash data to store', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ driver: 'memory' })
    orbit.install(core as any)

    const middleware = core.middleware!

    // First request: Set flash
    const c1 = createContext()
    await middleware(c1, async () => {
      const session = c1.get('session')
      session.flash('persisted', 'This should be in store')
    })

    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')
    expect(sessionCookie).toBeTruthy()
    expect(c1.setCookies.some((c) => c.includes('gravito_session='))).toBe(true)
  })
})
