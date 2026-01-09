import { describe, expect, it } from 'bun:test'
import { gravitoSeo } from '../src/middleware'

class TestSeoEngine {
  static initCalls = 0

  constructor(
    private config: {
      baseUrl: string
      shouldFailInit?: boolean
      shouldFailRender?: boolean
      shouldReturnNull?: boolean
    }
  ) {}

  async init() {
    TestSeoEngine.initCalls += 1
    if (this.config.shouldFailInit) {
      throw new Error('init failed')
    }
  }

  async render(path: string) {
    if (this.config.shouldFailRender) {
      throw new Error('render failed')
    }
    if (this.config.shouldReturnNull) {
      return null
    }
    return `<xml base="${this.config.baseUrl}" path="${path}" />`
  }
}

describe('gravitoSeo middleware', () => {
  it('exports gravitoSeo function', () => {
    expect(typeof gravitoSeo).toBe('function')
  })

  it('returns a middleware handler', () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )
    expect(typeof middleware).toBe('function')
  })

  it('calls next for non-seo paths', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    let called = false
    await middleware({ req: { path: '/about', query: () => null } } as any, () => {
      called = true
    })
    expect(called).toBe(true)
  })

  it('skips doc paths even when they include sitemap', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    let called = false
    await middleware({ req: { path: '/docs/sitemap.xml', query: () => null } } as any, () => {
      called = true
    })
    expect(called).toBe(true)
  })

  it('initializes only once', async () => {
    TestSeoEngine.initCalls = 0
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    const c = {
      req: { path: '/sitemap.xml', query: () => null },
      header: () => {},
      body: () => {},
      text: () => {},
    }

    await middleware(c as any, () => {})
    await middleware(
      {
        ...c,
        req: { path: '/robots.txt', query: () => null },
      } as any,
      () => {}
    )

    expect(TestSeoEngine.initCalls).toBe(1)
  })

  it('handles sitemap requests', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    const c = {
      req: { path: '/sitemap.xml', query: () => null },
      headers: {} as Record<string, string>,
      header: (key: string, value: string) => {
        c.headers[key] = value
      },
      bodyValue: '',
      body: (value: string) => {
        c.bodyValue = value
        return value
      },
      text: () => {},
    }

    await middleware(c as any, () => {})
    expect(c.headers['Content-Type']).toBe('application/xml')
    expect(c.bodyValue).toContain('sitemap.xml')
  })

  it('handles robots.txt requests', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    const c = {
      req: { path: '/robots.txt', query: () => null },
      headers: {} as Record<string, string>,
      header: (key: string, value: string) => {
        c.headers[key] = value
      },
      bodyValue: '',
      body: (value: string) => {
        c.bodyValue = value
        return value
      },
      text: () => {},
    }

    await middleware(c as any, () => {})
    expect(c.headers['Content-Type']).toBe('text/plain')
    expect(c.bodyValue).toContain('robots.txt')
  })

  it('calls next when render returns null', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        shouldReturnNull: true,
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    let called = false
    await middleware(
      {
        req: { path: '/sitemap.xml', query: () => null },
        header: () => {},
        body: () => {},
        text: () => {},
      } as any,
      () => {
        called = true
      }
    )
    expect(called).toBe(true)
  })

  it('returns 500 on init failure', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        shouldFailInit: true,
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    const c = {
      req: { path: '/sitemap.xml', query: () => null },
      textBody: '',
      status: 0,
      text: (body: string, status: number) => {
        c.textBody = body
        c.status = status
        return body
      },
    }

    await middleware(c as any, () => {})
    expect(c.status).toBe(500)
    expect(c.textBody).toBe('Internal Server Error')
  })

  it('returns 500 on render error', async () => {
    const middleware = gravitoSeo(
      {
        baseUrl: 'https://example.com',
        mode: 'dynamic',
        resolvers: [],
        shouldFailRender: true,
      } as any,
      {
        SeoEngine: TestSeoEngine,
      }
    )

    const c = {
      req: { path: '/sitemap.xml', query: () => '1' },
      textBody: '',
      status: 0,
      text: (body: string, status: number) => {
        c.textBody = body
        c.status = status
        return body
      },
      header: () => {},
      body: () => {},
    }

    await middleware(c as any, () => {})
    expect(c.status).toBe(500)
    expect(c.textBody).toBe('Internal Server Error')
  })
})
