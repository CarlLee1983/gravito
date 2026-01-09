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
})
