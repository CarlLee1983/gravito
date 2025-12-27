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
})
