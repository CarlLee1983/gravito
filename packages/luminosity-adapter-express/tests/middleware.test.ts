import { describe, expect, it } from 'bun:test'
import { gravitoSeo } from '../src/middleware'

class RobotsBuilder {
  constructor(
    private config: { rules: Array<{ userAgent: string; allow?: string[]; disallow?: string[] }> },
    private baseUrl: string
  ) {}

  build() {
    return `robots:${this.baseUrl}:${this.config.rules.length}`
  }
}

class SeoRenderer {
  constructor(private config: { baseUrl: string }) {}

  render(entries: Array<{ url: string }>, path: string, page?: number) {
    return `<xml base="${this.config.baseUrl}" page="${page ?? 1}" path="${path}" count="${entries.length}" />`
  }
}

class SeoEngine {
  private initialized = false

  constructor(
    private config: {
      resolvers: Array<{ fetch: () => Promise<Array<{ url: string }>> }>
      shouldFailInit?: boolean
      shouldFailFetch?: boolean
    }
  ) {}

  async init() {
    if (this.config.shouldFailInit) {
      throw new Error('init failed')
    }
    this.initialized = true
  }

  getStrategy() {
    return {
      getEntries: async () => {
        if (!this.initialized) {
          throw new Error('not ready')
        }
        if (this.config.shouldFailFetch) {
          throw new Error('fetch failed')
        }
        const entries: Array<{ url: string }> = []
        for (const resolver of this.config.resolvers) {
          entries.push(...(await resolver.fetch()))
        }
        return entries
      },
    }
  }
}

describe('gravitoSeo middleware', () => {
  it('returns a middleware function', () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )
    expect(typeof middleware).toBe('function')
  })

  it('handles robots.txt with custom rules', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        robots: {
          rules: [{ userAgent: '*', allow: ['/'] }],
        },
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )

    const res = {
      headers: {} as Record<string, string>,
      body: '',
      setHeader: (key: string, value: string) => {
        res.headers[key] = value
      },
      send: (body: string) => {
        res.body = body
      },
    }

    await middleware({ path: '/robots.txt' } as any, res as any, () => {})
    expect(res.headers['Content-Type']).toBe('text/plain')
    expect(res.body).toContain('robots:https://example.com')
  })

  it('handles robots.txt with default rules', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )

    const res = {
      headers: {} as Record<string, string>,
      body: '',
      setHeader: (key: string, value: string) => {
        res.headers[key] = value
      },
      send: (body: string) => {
        res.body = body
      },
    }

    await middleware({ path: '/robots.txt' } as any, res as any, () => {})
    expect(res.body).toContain('robots:https://example.com')
  })

  it('handles sitemap requests', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [
          {
            fetch: async () => [{ url: '/one' }, { url: '/two' }],
          },
        ],
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )

    const res = {
      header: (key: string, value: string) => {
        res.headers[key] = value
      },
      headers: {} as Record<string, string>,
      body: '',
      send: (body: string) => {
        res.body = body
      },
    }

    await middleware({ path: '/sitemap.xml', query: {} } as any, res as any, () => {})
    expect(res.headers['Content-Type']).toBe('application/xml')
    expect(res.body).toContain('count="2"')
  })

  it('calls next on init failure', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        shouldFailInit: true,
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )

    const next = (err?: unknown) => err
    const result = await middleware({ path: '/sitemap.xml', query: {} } as any, {} as any, next)
    expect(result).toBeInstanceOf(Error)
  })

  it('calls next on render error', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        shouldFailFetch: true,
      } as any,
      {
        RobotsBuilder,
        SeoEngine,
        SeoRenderer,
      }
    )

    let called: unknown
    const next = (err?: unknown) => {
      called = err
    }
    await middleware({ path: '/sitemap.xml', query: {} } as any, {} as any, next)
    expect(called).toBeInstanceOf(Error)
  })
})
