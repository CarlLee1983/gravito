import { RobotsBuilder, type SeoConfig, SeoEngine, SeoRenderer } from '@gravito/luminosity'
import type { Context, MiddlewareHandler } from 'hono'

/**
 * Create a Gravito SEO middleware for Hono.
 *
 * This middleware handles requests for `sitemap.xml` and `robots.txt`.
 * It automatically initializes the SEO engine and renders the appropriate content
 * based on the request path.
 *
 * @param config - The SEO configuration object.
 * @returns A Hono middleware handler.
 *
 * @example
 * ```typescript
 * import { gravitoSeo } from '@gravito/luminosity-adapter-hono'
 *
 * app.use('*', gravitoSeo({
 *   baseUrl: 'https://example.com',
 *   mode: 'dynamic',
 *   // ... other config
 * }))
 * ```
 */
export function gravitoSeo(config: SeoConfig): MiddlewareHandler {
  const engine = new SeoEngine(config)

  // Lazy init on first request or immediate?
  // Let's do lazy to avoid startup blocking, but we could add an option.
  let initialized = false

  return async (c: Context, _next) => {
    // Check if request is for sitemap
    // We assume this middleware is mounted on a specific path OR the user uses a wildcard mount.
    // If wildcard, we need to check path.
    // BUT typically user mounts it like: app.get('/sitemap.xml', gravitoSeo(c))
    // To support robots.txt, we should probably check the path if it's not explicitly matched?
    // Let's SUPPORT both explicit mount and "smart" mount.

    const path = c.req.path

    const isRobots = path.endsWith('/robots.txt')
    const isSitemap = path.endsWith('/sitemap.xml') || path.includes('sitemap_page_')

    if (!isRobots && !isSitemap) {
      return await _next()
    }

    // Robots.txt Handler
    if (isRobots) {
      if (config.robots) {
        const robotsBuilder = new RobotsBuilder(config.robots, config.baseUrl)
        const content = robotsBuilder.build()
        return c.text(content)
      }
      const defaultBuilder = new RobotsBuilder(
        {
          rules: [{ userAgent: '*', allow: ['/'] }],
        },
        config.baseUrl
      )
      return c.text(defaultBuilder.build())
    }

    // Sitemap Handler
    if (!initialized) {
      try {
        await engine.init()
        initialized = true
      } catch (e) {
        console.error('[GravitoSeo] Init failed:', e)
        return c.text('Internal Server Error', 500)
      }
    }

    try {
      const strategy = engine.getStrategy()
      const entries = await strategy.getEntries()

      const renderer = new SeoRenderer(config)
      const pageQuery = c.req.query('page')
      const page = pageQuery ? Number.parseInt(pageQuery, 10) : undefined
      const fullUrl = `${config.baseUrl}${path}`

      const xml = renderer.render(entries, fullUrl, page)

      c.header('Content-Type', 'application/xml')
      return c.body(xml)
    } catch (e) {
      console.error('[GravitoSeo] Middleware Error:', e)
      return c.text('Internal Server Error', 500)
    }
  }
}
