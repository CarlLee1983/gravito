import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { NuxtScanner, SitemapBuilder } from '@gravito/luminosity'

const FIXTURES_DIR = join(import.meta.dirname, '../fixtures')

describe('NuxtScanner', () => {
  describe('scan()', () => {
    it('should discover static routes from pages directory', async () => {
      const scanner = new NuxtScanner({
        pagesDir: 'nuxt-pages',
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)

      // Should find index page as /
      expect(paths).toContain('/')

      // Should find about page
      expect(paths).toContain('/about')
    })

    it('should discover Nuxt 3 dynamic routes with [param] syntax', async () => {
      const scanner = new NuxtScanner({
        pagesDir: 'nuxt-pages',
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      // Should find blog/[slug] as /blog/:slug
      const blogRoute = routes.find((r) => r.path.includes('blog') && r.isDynamic)
      expect(blogRoute).toBeDefined()
      expect(blogRoute?.isDynamic).toBe(true)
      expect(blogRoute?.params).toContain('slug')
    })

    it('should discover Nuxt 2 dynamic routes with _param syntax', async () => {
      const scanner = new NuxtScanner({
        pagesDir: 'nuxt-pages',
        cwd: FIXTURES_DIR,
      })
      const routes = await scanner.scan()

      // Should find users/_id as /users/:id
      const userRoute = routes.find((r) => r.path.includes('users') && r.isDynamic)
      expect(userRoute).toBeDefined()
      expect(userRoute?.isDynamic).toBe(true)
      expect(userRoute?.params).toContain('id')
    })

    it('should apply exclude patterns', async () => {
      const scanner = new NuxtScanner({
        pagesDir: 'nuxt-pages',
        cwd: FIXTURES_DIR,
        excludePatterns: ['/users'],
      })
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)
      const hasUserRoute = paths.some((p) => p.includes('users'))
      expect(hasUserRoute).toBe(false)
    })
  })

  describe('SitemapBuilder integration', () => {
    it('should generate sitemap entries for Nuxt app', async () => {
      const builder = new SitemapBuilder({
        scanner: new NuxtScanner({
          pagesDir: 'nuxt-pages',
          cwd: FIXTURES_DIR,
        }),
        hostname: 'https://example.com',
        dynamicResolvers: [
          {
            pattern: '/blog/:slug',
            resolve: () => [{ slug: 'nuxt-guide' }, { slug: 'vue-tips' }],
          },
          {
            pattern: '/users/:id',
            resolve: () => [{ id: '1' }, { id: '2' }, { id: '3' }],
          },
        ],
      })

      const entries = await builder.build()

      const urls = entries.map((e) => e.url)

      // Static routes
      expect(urls).toContain('https://example.com/')
      expect(urls).toContain('https://example.com/about')

      // Dynamic routes resolved
      expect(urls).toContain('https://example.com/blog/nuxt-guide')
      expect(urls).toContain('https://example.com/blog/vue-tips')
      expect(urls).toContain('https://example.com/users/1')
      expect(urls).toContain('https://example.com/users/2')
      expect(urls).toContain('https://example.com/users/3')
    })
  })
})
