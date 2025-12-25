import { type SeoConfig, SeoEngine } from '@gravito/luminosity'
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
 */
export function gravitoSeo(config: SeoConfig): MiddlewareHandler {
  const engine = new SeoEngine(config)
  let initialized = false

  return async (c: Context, next) => {
    const path = c.req.path
    const isRobots = path === '/robots.txt' || path.endsWith('/robots.txt')
    const isSitemap =
      path === '/sitemap.xml' ||
      path.endsWith('/sitemap.xml') ||
      /sitemap_page_\d+/.test(path) ||
      (path.includes('sitemap') && (path.endsWith('.xml') || c.req.query('page')))

    if (!isRobots && !isSitemap) {
      return await next()
    }

    // Explicitly ignore doc pages even if they contain the keyword
    if (path.includes('/docs/')) {
      return await next()
    }

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
      // Use the unified engine.render method
      const result = await engine.render(path)

      if (!result) {
        return await next()
      }

      if (path.endsWith('.xml') || path.includes('sitemap')) {
        c.header('Content-Type', 'application/xml')
      } else {
        c.header('Content-Type', 'text/plain')
      }

      return c.body(result)
    } catch (e) {
      console.error('[GravitoSeo] Middleware Error:', e)
      return c.text('Internal Server Error', 500)
    }
  }
}
