import { describe, expect, it } from 'bun:test'
import { SitemapBuilder } from '../src/scanner/SitemapBuilder'
import type { RouteScanner, ScannedRoute } from '../src/scanner/types'

// Mock scanner for testing
class MockScanner implements RouteScanner {
  readonly framework = 'mock'

  constructor(private routes: ScannedRoute[]) {}

  async scan(): Promise<ScannedRoute[]> {
    return this.routes
  }
}

describe('SitemapBuilder', () => {
  it('should build entries for static routes', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/about', method: 'GET', isDynamic: false },
      { path: '/contact', method: 'GET', isDynamic: false },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(3)
    expect(entries[0]?.url).toBe('https://example.com/')
    expect(entries[1]?.url).toBe('https://example.com/about')
    expect(entries[2]?.url).toBe('https://example.com/contact')
  })

  it('should skip non-GET routes', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/api/users', method: 'POST', isDynamic: false },
      { path: '/api/users/:id', method: 'PUT', isDynamic: true, params: ['id'] },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.url).toBe('https://example.com/')
  })

  it('should resolve dynamic routes with resolver', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/blog/:slug', method: 'GET', isDynamic: true, params: ['slug'] },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      dynamicResolvers: [
        {
          pattern: '/blog/:slug',
          resolve: () => [{ slug: 'hello-world' }, { slug: 'another-post' }],
        },
      ],
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(3)
    expect(entries[0]?.url).toBe('https://example.com/')
    expect(entries[1]?.url).toBe('https://example.com/blog/hello-world')
    expect(entries[2]?.url).toBe('https://example.com/blog/another-post')
  })

  it('should apply exclude patterns', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/admin/dashboard', method: 'GET', isDynamic: false },
      { path: '/public/about', method: 'GET', isDynamic: false },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      excludePatterns: ['/admin/*'],
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.url)).not.toContain('https://example.com/admin/dashboard')
  })

  it('should apply default priority and changefreq', async () => {
    const scanner = new MockScanner([{ path: '/', method: 'GET', isDynamic: false }])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      defaultPriority: 0.8,
      defaultChangefreq: 'weekly',
    })

    const entries = await builder.build()

    expect(entries[0]?.priority).toBe(0.8)
    expect(entries[0]?.changefreq).toBe('weekly')
  })

  it('should skip routes with meta.exclude', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/internal', method: 'GET', isDynamic: false, meta: { exclude: true } },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.url).toBe('https://example.com/')
  })

  it('should support addResolver() for dynamic routes', async () => {
    const scanner = new MockScanner([
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/products/:id', method: 'GET', isDynamic: true, params: ['id'] },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    // 透過 addResolver 註冊
    builder.addResolver({
      pattern: '/products/:id',
      resolve: () => [{ id: '1' }, { id: '2' }],
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(3)
    expect(entries[1]?.url).toBe('https://example.com/products/1')
    expect(entries[2]?.url).toBe('https://example.com/products/2')
  })

  it('should return framework name from scanner', () => {
    const scanner = new MockScanner([])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    expect(builder.framework).toBe('mock')
  })

  it('should return all registered resolvers', () => {
    const scanner = new MockScanner([])

    const resolver1 = {
      pattern: '/blog/:slug',
      resolve: () => [{ slug: 'test' }],
    }
    const resolver2 = {
      pattern: '/products/:id',
      resolve: () => [{ id: '1' }],
    }

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      dynamicResolvers: [resolver1, resolver2],
    })

    expect(builder.resolvers).toHaveLength(2)
  })

  it('should include ALL method routes', async () => {
    const scanner = new MockScanner([{ path: '/wildcard', method: 'ALL', isDynamic: false }])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.url).toBe('https://example.com/wildcard')
  })

  it('should apply includePatterns filter', async () => {
    const scanner = new MockScanner([
      { path: '/blog/post1', method: 'GET', isDynamic: false },
      { path: '/about', method: 'GET', isDynamic: false },
      { path: '/blog/post2', method: 'GET', isDynamic: false },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      includePatterns: ['/blog/*'],
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(2)
    expect(entries.every((e) => e.url.includes('/blog/'))).toBe(true)
  })

  it('should warn when no resolver found for dynamic route', async () => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: any[]) => warnings.push(args.join(' '))

    const scanner = new MockScanner([
      { path: '/users/:id', method: 'GET', isDynamic: true, params: ['id'] },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0]).toContain('No resolver for dynamic route')

    console.warn = originalWarn
  })

  it('should override hostname in build()', async () => {
    const scanner = new MockScanner([{ path: '/page', method: 'GET', isDynamic: false }])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build('https://override.com')

    expect(entries[0]?.url).toBe('https://override.com/page')
  })

  it('should apply resolver meta (priority, changefreq, lastmod)', async () => {
    const scanner = new MockScanner([
      { path: '/blog/:slug', method: 'GET', isDynamic: true, params: ['slug'] },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
      dynamicResolvers: [
        {
          pattern: '/blog/:slug',
          resolve: () => [{ slug: 'post1' }],
          meta: {
            priority: 0.9,
            changefreq: 'daily',
            lastmod: '2024-01-01',
          },
        },
      ],
    })

    const entries = await builder.build()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.priority).toBe(0.9)
    expect(entries[0]?.changefreq).toBe('daily')
    expect(entries[0]?.lastmod).toBe('2024-01-01')
  })

  it('should use route meta when no resolver meta', async () => {
    const scanner = new MockScanner([
      {
        path: '/static',
        method: 'GET',
        isDynamic: false,
        meta: { priority: 0.7, changefreq: 'monthly' as const, lastmod: '2024-06-01' },
      },
    ])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries[0]?.priority).toBe(0.7)
    expect(entries[0]?.changefreq).toBe('monthly')
    expect(entries[0]?.lastmod).toBe('2024-06-01')
  })

  it('should chain addResolver() calls', () => {
    const scanner = new MockScanner([])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const result = builder
      .addResolver({ pattern: '/a/:id', resolve: () => [] })
      .addResolver({ pattern: '/b/:id', resolve: () => [] })

    expect(result).toBe(builder)
    expect(builder.resolvers).toHaveLength(2)
  })

  it('should handle path without leading slash', async () => {
    const scanner = new MockScanner([{ path: 'no-slash', method: 'GET', isDynamic: false }])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com',
    })

    const entries = await builder.build()

    expect(entries[0]?.url).toBe('https://example.com/no-slash')
  })

  it('should strip trailing slash from hostname', async () => {
    const scanner = new MockScanner([{ path: '/page', method: 'GET', isDynamic: false }])

    const builder = new SitemapBuilder({
      scanner,
      hostname: 'https://example.com/',
    })

    const entries = await builder.build()

    expect(entries[0]?.url).toBe('https://example.com/page')
  })
})
