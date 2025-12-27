import { describe, expect, it } from 'bun:test'
import { ExpressScanner, SitemapBuilder } from '@gravito/luminosity'
import express from 'express'

describe('ExpressScanner', () => {
  describe('scan()', () => {
    it('should discover static routes from Express app', async () => {
      const app = express()
      app.get('/', (_req, res) => res.send('Home'))
      app.get('/about', (_req, res) => res.send('About'))
      app.get('/contact', (_req, res) => res.send('Contact'))

      const scanner = new ExpressScanner(app)
      const routes = await scanner.scan()

      expect(routes).toHaveLength(3)
      expect(routes.map((r) => r.path)).toContain('/')
      expect(routes.map((r) => r.path)).toContain('/about')
      expect(routes.map((r) => r.path)).toContain('/contact')
      expect(routes.every((r) => r.method === 'GET')).toBe(true)
    })

    it('should discover dynamic routes with parameters', async () => {
      const app = express()
      app.get('/blog/:slug', (_req, res) => res.send('Blog'))
      app.get('/products/:category/:id', (_req, res) => res.send('Product'))

      const scanner = new ExpressScanner(app)
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

    it('should discover all HTTP methods', async () => {
      const app = express()
      app.get('/users', (_req, res) => res.send('List'))
      app.post('/users', (_req, res) => res.send('Create'))
      app.put('/users/:id', (_req, res) => res.send('Update'))
      app.delete('/users/:id', (_req, res) => res.send('Delete'))

      const scanner = new ExpressScanner(app)
      const routes = await scanner.scan()

      expect(routes).toHaveLength(4)

      const methods = routes.map((r) => r.method)
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('PUT')
      expect(methods).toContain('DELETE')
    })

    it('should apply exclude patterns', async () => {
      const app = express()
      app.get('/', (_req, res) => res.send('Home'))
      app.get('/api/users', (_req, res) => res.send('API'))
      app.get('/admin/dashboard', (_req, res) => res.send('Admin'))
      app.get('/public/about', (_req, res) => res.send('About'))

      const scanner = new ExpressScanner(app, {
        excludePatterns: [/^\/api/, /^\/admin/],
      })
      const routes = await scanner.scan()

      expect(routes).toHaveLength(2)
      expect(routes.map((r) => r.path)).toContain('/')
      expect(routes.map((r) => r.path)).toContain('/public/about')
    })

    it('should handle nested routers', async () => {
      const app = express()
      const apiRouter = express.Router()

      apiRouter.get('/users', (_req, res) => res.send('Users'))
      apiRouter.get('/posts', (_req, res) => res.send('Posts'))

      app.use('/api', apiRouter)
      app.get('/', (_req, res) => res.send('Home'))

      const scanner = new ExpressScanner(app)
      const routes = await scanner.scan()

      const paths = routes.map((r) => r.path)
      expect(paths).toContain('/')
      // Express nested routers should resolve to /api/users and /api/posts
      expect(paths).toContain('/api/users')
      expect(paths).toContain('/api/posts')
    })
  })

  describe('SitemapBuilder integration', () => {
    it('should generate sitemap entries for static routes', async () => {
      const app = express()
      app.get('/', (_req, res) => res.send('Home'))
      app.get('/about', (_req, res) => res.send('About'))

      const builder = new SitemapBuilder({
        scanner: new ExpressScanner(app),
        hostname: 'https://example.com',
      })

      const entries = await builder.build()

      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.url)).toContain('https://example.com/')
      expect(entries.map((e) => e.url)).toContain('https://example.com/about')
    })

    it('should resolve dynamic routes with resolver', async () => {
      const app = express()
      app.get('/', (_req, res) => res.send('Home'))
      app.get('/blog/:slug', (_req, res) => res.send('Blog'))

      const builder = new SitemapBuilder({
        scanner: new ExpressScanner(app),
        hostname: 'https://example.com',
        dynamicResolvers: [
          {
            pattern: '/blog/:slug',
            resolve: () => [{ slug: 'hello-world' }, { slug: 'second-post' }],
          },
        ],
      })

      const entries = await builder.build()

      expect(entries).toHaveLength(3) // 1 static + 2 resolved
      expect(entries.map((e) => e.url)).toContain('https://example.com/')
      expect(entries.map((e) => e.url)).toContain('https://example.com/blog/hello-world')
      expect(entries.map((e) => e.url)).toContain('https://example.com/blog/second-post')
    })

    it('should skip non-GET routes for sitemap', async () => {
      const app = express()
      app.get('/', (_req, res) => res.send('Home'))
      app.post('/api/submit', (_req, res) => res.send('Submit'))
      app.put('/api/update/:id', (_req, res) => res.send('Update'))

      const builder = new SitemapBuilder({
        scanner: new ExpressScanner(app),
        hostname: 'https://example.com',
      })

      const entries = await builder.build()

      // Only GET routes should be in sitemap
      expect(entries).toHaveLength(1)
      expect(entries[0]?.url).toBe('https://example.com/')
    })
  })
})
