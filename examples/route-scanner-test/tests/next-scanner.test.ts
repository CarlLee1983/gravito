import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { NextScanner, SitemapBuilder } from '@gravito/luminosity'

const FIXTURES_DIR = join(import.meta.dirname, '../fixtures/next-app')

describe('NextScanner', () => {
  describe('scan() - App Router', () => {
    it('should discover static routes from app directory', async () => {
      const scanner = new NextScanner({
        appDir: join(FIXTURES_DIR, 'app'),
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)

      // Should find root page
      expect(paths).toContain('/')

      // Should find about page
      expect(paths).toContain('/about')
    })

    it('should discover dynamic routes with [param] syntax', async () => {
      const scanner = new NextScanner({
        appDir: join(FIXTURES_DIR, 'app'),
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      // Should find blog/[slug] as /blog/:slug
      const blogRoute = routes.find((r) => r.path.includes('blog') && r.path.includes(':slug'))
      expect(blogRoute).toBeDefined()
      expect(blogRoute?.isDynamic).toBe(true)
      expect(blogRoute?.params).toContain('slug')

      // Should find products/[category]/[id]
      const productRoute = routes.find((r) => r.path.includes('products') && r.isDynamic)
      expect(productRoute).toBeDefined()
      expect(productRoute?.params).toContain('category')
      expect(productRoute?.params).toContain('id')
    })

    it('should handle route groups (parentheses)', async () => {
      const scanner = new NextScanner({
        appDir: join(FIXTURES_DIR, 'app'),
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      // Route groups like (admin) should not appear in the path
      const dashboardRoute = routes.find((r) => r.path.includes('dashboard'))
      expect(dashboardRoute).toBeDefined()
      // The path should be /dashboard, not /(admin)/dashboard
      expect(dashboardRoute?.path).toBe('/dashboard')
    })

    it('should apply exclude patterns', async () => {
      const scanner = new NextScanner({
        appDir: join(FIXTURES_DIR, 'app'),
        cwd: FIXTURES_DIR,
        excludePatterns: ['/dashboard'],
      })
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)
      expect(paths).not.toContain('/dashboard')
    })
  })

  describe('SitemapBuilder integration', () => {
    it('should generate sitemap entries for Next.js app', async () => {
      const builder = new SitemapBuilder({
        scanner: new NextScanner({
          appDir: join(FIXTURES_DIR, 'app'),
          cwd: FIXTURES_DIR,
        }),
        hostname: 'https://example.com',
        dynamicResolvers: [
          {
            pattern: '/blog/:slug',
            resolve: () => [{ slug: 'hello-world' }, { slug: 'nextjs-tips' }],
          },
        ],
      })

      const entries = await builder.build()

      const urls = entries.map((e) => e.url)

      // Static routes
      expect(urls).toContain('https://example.com/')
      expect(urls).toContain('https://example.com/about')
      expect(urls).toContain('https://example.com/dashboard')

      // Dynamic routes resolved
      expect(urls).toContain('https://example.com/blog/hello-world')
      expect(urls).toContain('https://example.com/blog/nextjs-tips')
    })
  })
})
