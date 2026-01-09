import { describe, expect, it, mock } from 'bun:test'

mock.module('@gravito/plasma', () => ({
  Redis: {
    connection: () => ({
      get: async () => null,
      set: async () => {},
      del: async () => {},
    }),
  },
}))

const { OrbitPulsar } = await import('../src')

type Middleware = (c: any, next: () => Promise<void>) => Promise<Response | undefined>

const createCore = (sessionConfig?: any) => {
  let middleware: Middleware | null = null
  const core = {
    config: {
      has: (key: string) => key === 'session' && sessionConfig != null,
      get: () => sessionConfig,
    },
    logger: {
      info: mock(() => {}),
    },
    hooks: {
      doAction: mock(() => {}),
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

const createContext = ({
  cookie,
  method = 'GET',
  headers = {},
}: {
  cookie?: string
  method?: string
  headers?: Record<string, string>
} = {}) => {
  const store = new Map<string, unknown>()
  const setCookies: string[] = []
  const c = {
    req: {
      method,
      header: (name: string) => {
        if (name.toLowerCase() === 'cookie') {
          return cookie
        }
        return headers[name] ?? headers[name.toLowerCase()]
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
    json: (body: unknown, status: number) => new Response(JSON.stringify(body), { status }),
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

describe('OrbitPulsar middleware', () => {
  it('persists session data and issues cookies', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ csrf: { enabled: true } })
    orbit.install(core as any)

    const c1 = createContext()
    await core.middleware?.(c1, async () => {
      const session = c1.get('session') as any
      session.put('foo', 'bar')
      session.flash('notice', 'ok')
    })

    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')
    const csrfCookie = getCookieValue(c1.setCookies, 'XSRF-TOKEN')
    expect(sessionCookie).not.toBe('')
    expect(csrfCookie).not.toBe('')

    const c2 = createContext({ cookie: `gravito_session=${sessionCookie}` })
    await core.middleware?.(c2, async () => {
      const session = c2.get('session') as any
      expect(session.get('foo', null)).toBe('bar')
      expect(session.getFlash('notice', null)).toBe('ok')
      session.keep(['notice'])
    })

    expect(getCookieValue(c2.setCookies, 'gravito_session')).not.toBe('')
  })

  it('rejects unsafe requests without a CSRF header', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar()
    orbit.install(core as any)

    const c = createContext({ method: 'POST' })
    const result = await core.middleware?.(c, async () => {
      throw new Error('should not reach')
    })

    expect(result).toBeInstanceOf(Response)
    const res = result as Response
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('CSRF_ERROR')
  })

  it('accepts unsafe requests with matching CSRF header', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar()
    orbit.install(core as any)

    const c1 = createContext()
    let token = ''
    await core.middleware?.(c1, async () => {
      const csrf = c1.get('csrf') as any
      token = csrf.token()
    })
    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')

    const c2 = createContext({
      cookie: `gravito_session=${sessionCookie}`,
      method: 'POST',
      headers: { 'X-CSRF-Token': token },
    })
    let called = false
    const result = await core.middleware?.(c2, async () => {
      called = true
    })

    expect(called).toBe(true)
    expect(result).toBeUndefined()
  })

  it('expires idle sessions and regenerates ids', async () => {
    let now = 1_000_000
    const core = createCore()
    const orbit = new OrbitPulsar({
      now: () => now,
      idleTimeoutSeconds: 10,
      touchIntervalSeconds: 1,
      csrf: { enabled: false },
    })
    orbit.install(core as any)

    const c1 = createContext()
    await core.middleware?.(c1, async () => {
      const session = c1.get('session') as any
      session.put('foo', 'bar')
    })
    const sessionCookie = getCookieValue(c1.setCookies, 'gravito_session')

    now += 11_000
    const c2 = createContext({ cookie: `gravito_session=${sessionCookie}` })
    await core.middleware?.(c2, async () => {
      const session = c2.get('session') as any
      session.put('baz', 'qux')
    })
    const nextSessionCookie = getCookieValue(c2.setCookies, 'gravito_session')

    expect(nextSessionCookie).not.toBe('')
    expect(nextSessionCookie).not.toBe(sessionCookie)
  })

  it('supports regenerate and invalidate', async () => {
    const core = createCore()
    const orbit = new OrbitPulsar({ csrf: { enabled: false } })
    orbit.install(core as any)

    const c = createContext()
    await core.middleware?.(c, async () => {
      const session = c.get('session') as any
      session.put('foo', 'bar')
      session.regenerate()
      session.invalidate()
    })

    expect(core.hooks.doAction).toHaveBeenCalledWith('session:regenerated', expect.any(Object))
  })
})
