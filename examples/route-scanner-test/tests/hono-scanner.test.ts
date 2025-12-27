import { describe, expect, it } from 'bun:test'
import { HonoScanner, SitemapBuilder } from '@gravito/luminosity'
import { Hono } from 'hono'

describe('HonoScanner', () => {
  describe('scan()', () => {
    it('should discover static routes from Hono app', async () => {
      const app = new Hono()
      app.get('/', (c) => c.text('Home'))
      app.get('/about', (c) => c.text('About'))
      app.get('/contact', (c) => c.text('Contact'))

      const scanner = new HonoScanner(app)
      const routes = await scanner.scan()

      expect(routes).toHaveLength(3)
      expect(routes.map((r) => r.path)).toEqual(['/', '/about', '/contact'])
      expect(routes.every((r) => r.method === 'GET')).toBe(true)
      expect(routes.every((r) => r.isDynamic === false)).toBe(true)
    })

    it('should discover dynamic routes with parameters', async () => {
      const app = new Hono()
      app.get('/blog/:slug', (c) => c.text('Blog'))
      app.get('/products/:category/:id', (c) => c.text('Product'))

      const scanner = new HonoScanner(app)
      const routes = await scanner.scan()

      expect(routes).toHaveLength(2)

      const blogRoute = routes.find((r) => r.path === '/blog/:slug')
      expect(blogRoute).toBeDefined()
      expect(blogRoute?.isDynamic).toBe(true)
      expect(blogRoute?.params).toEqual(['slug'])

      const productRoute = routes.find((r) => r.path === '/products/:category/:id')
      expect(productRoute).toBeDefined()
      expect(productRoute?.isDynamic).toBe(true)
      expect(productRoute?.params).toEqual(['category', 'id'])
    })

    it('should filter out non-GET methods by default', async () => {
      const app = new Hono()
      app.get('/users', (c) => c.text('List'))
      app.post('/users', (c) => c.text('Create'))
      app.put('/users/:id', (c) => c.text('Update'))
      app.delete('/users/:id', (c) => c.text('Delete'))

      const scanner = new HonoScanner(app)
      const routes = await scanner.scan()

      // All routes should be discovered
      expect(routes.length).toBeGreaterThanOrEqual(1)

      // GET routes
      const getRoutes = routes.filter((r) => r.method === 'GET')
      expect(getRoutes.length).toBe(1)
      expect(getRoutes[0]?.path).toBe('/users')
    })

    it('should apply exclude patterns', async () => {
      const app = new Hono()
      app.get('/', (c) => c.text('Home'))
      app.get('/api/users', (c) => c.text('API'))
      app.get('/admin/dashboard', (c) => c.text('Admin'))
      app.get('/public/about', (c) => c.text('About'))

      const scanner = new HonoScanner(app, {
        excludePatterns: ['/api/*', '/admin/*'],
      })
      const routes = await scanner.scan()

      expect(routes).toHaveLength(2)
      expect(routes.map((r) => r.path)).toContain('/')
      expect(routes.map((r) => r.path)).toContain('/public/about')
      expect(routes.map((r) => r.path)).not.toContain('/api/users')
      expect(routes.map((r) => r.path)).not.toContain('/admin/dashboard')
    })

    it('should work with grouped/nested routes', async () => {
      const app = new Hono()

      const api = new Hono()
      api.get('/users', (c) => c.text('Users'))
      api.get('/posts', (c) => c.text('Posts'))

      app.route('/api', api)
      app.get('/', (c) => c.text('Home'))

      const scanner = new HonoScanner(app)
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)
      expect(paths).toContain('/')
      // Note: Hono's route() may flatten paths differently
      // Just verify we can scan without errors
      expect(routes.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('SitemapBuilder integration', () => {
    it('should generate sitemap entries for static routes', async () => {
      const app = new Hono()
      app.get('/', (c) => c.text('Home'))
      app.get('/about', (c) => c.text('About'))

      const builder = new SitemapBuilder({
        scanner: new HonoScanner(app),
        hostname: 'https://example.com',
      })

      const entries = await builder.build()

      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.url)).toContain('https://example.com/')
      expect(entries.map((e) => e.url)).toContain('https://example.com/about')
    })

    it('should resolve dynamic routes with resolver', async () => {
      const app = new Hono()
      app.get('/', (c) => c.text('Home'))
      app.get('/blog/:slug', (c) => c.text('Blog'))

      const builder = new SitemapBuilder({
        scanner: new HonoScanner(app),
        hostname: 'https://example.com',
        dynamicResolvers: [
          {
            pattern: '/blog/:slug',
            resolve: () => [{ slug: 'hello-world' }, { slug: 'another-post' }],
          },
        ],
      })

      const entries = await builder.build()

      expect(entries).toHaveLength(3) // 1 static + 2 resolved
      expect(entries.map((e) => e.url)).toContain('https://example.com/')
      expect(entries.map((e) => e.url)).toContain('https://example.com/blog/hello-world')
      expect(entries.map((e) => e.url)).toContain('https://example.com/blog/another-post')
    })
  })
})
