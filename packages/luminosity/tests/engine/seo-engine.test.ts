import { describe, expect, it } from 'bun:test'
import { SeoEngine } from '../../src/engine/SeoEngine'

describe('SeoEngine', () => {
  it('renders robots.txt and sitemap.xml', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [
        {
          name: 'static',
          fetch: async () => [{ url: '/about' }],
        },
      ],
    })

    await engine.init()

    const robots = await engine.render('/robots.txt')
    expect(robots).toContain('User-agent')

    const sitemap = await engine.render('/sitemap.xml')
    expect(sitemap).toContain('<urlset')
    await engine.shutdown()
  })

  it('throws on unknown mode', () => {
    expect(
      () =>
        new SeoEngine({
          mode: 'unknown' as 'dynamic',
          baseUrl: 'https://example.com',
          resolvers: [],
        })
    ).toThrow('Unknown mode')
  })

  it('returns null for non-SEO paths', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
    })

    await engine.init()

    const result = await engine.render('/about')
    expect(result).toBeNull()

    const result2 = await engine.render('/api/data')
    expect(result2).toBeNull()

    await engine.shutdown()
  })

  it('getEntries returns entries from strategy', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [
        {
          name: 'pages',
          fetch: () => [{ url: '/page1' }, { url: '/page2' }],
        },
      ],
    })

    await engine.init()

    const entries = await engine.getEntries()
    expect(entries.length).toBe(2)
    expect(entries.map((e: any) => e.url)).toContain('/page1')
    expect(entries.map((e: any) => e.url)).toContain('/page2')

    await engine.shutdown()
  })

  it('getStrategy returns the active strategy', () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
    })

    const strategy = engine.getStrategy()
    expect(strategy).toBeDefined()
    expect(strategy.getEntries).toBeDefined()
    expect(strategy.init).toBeDefined()
  })

  it('creates cached mode engine', async () => {
    const engine = new SeoEngine({
      mode: 'cached',
      baseUrl: 'https://example.com',
      resolvers: [
        {
          name: 'cached-data',
          fetch: () => [{ url: '/cached' }],
        },
      ],
      cache: { ttl: 60 },
    })

    await engine.init()

    const entries = await engine.getEntries()
    expect(entries.length).toBe(1)

    await engine.shutdown()
  })

  it('renders paginated sitemap', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [
        {
          name: 'pages',
          fetch: () => [{ url: '/a' }, { url: '/b' }],
        },
      ],
    })

    await engine.init()

    const sitemap = await engine.render('/sitemap_page_1.xml')
    expect(sitemap).toContain('<urlset')

    await engine.shutdown()
  })

  it('renders robots.txt with custom config', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
      robots: {
        rules: [{ userAgent: 'Googlebot', allow: ['/'], disallow: ['/private'] }],
      },
    })

    await engine.init()

    const robots = await engine.render('/robots.txt')
    expect(robots).toContain('Googlebot')
    expect(robots).toContain('/private')

    await engine.shutdown()
  })

  it('handles shutdown when strategy has no shutdown method', async () => {
    const engine = new SeoEngine({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
    })

    await engine.init()

    // shutdown 不應拋錯，即使 strategy 沒有 shutdown 方法
    await engine.shutdown()
  })
})
