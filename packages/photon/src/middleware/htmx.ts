import type { MiddlewareHandler } from 'hono' // Direct import to avoid circular dependency

/**
 * HTMX Middleware for Photon
 *
 * Automatically detects HTMX requests and provides a helper method
 * to check if the current request is from HTMX.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { htmxMiddleware } from '@gravito/photon/middleware/htmx'
 *
 * const app = new Photon()
 * app.use(htmxMiddleware())
 *
 * app.get('/search', async (c) => {
 *   const view = c.get('view')
 *   const query = c.req.query('q')
 *
 *   // Use the helper method instead of checking header manually
 *   if (c.get('htmx')) {
 *     const results = await db.posts.search(query)
 *     return c.html(view.render('partials/search-results', { results }))
 *   }
 *
 *   return c.html(view.render('search-page', { query }))
 * })
 * ```
 */
export const htmxMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    // Check for HTMX request header
    const isHtmx = c.req.header('HX-Request') === 'true'

    // Store in context for easy access
    c.set('htmx', isHtmx)

    // Also store HTMX-specific headers if present
    if (isHtmx) {
      c.set('htmx.boosted', c.req.header('HX-Boosted') === 'true')
      c.set('htmx.currentUrl', c.req.header('HX-Current-URL') || null)
      c.set('htmx.historyRestoreRequest', c.req.header('HX-History-Restore-Request') === 'true')
      c.set('htmx.prompt', c.req.header('HX-Prompt') || null)
      c.set('htmx.request', c.req.header('HX-Request') === 'true')
      c.set('htmx.target', c.req.header('HX-Target') || null)
      c.set('htmx.trigger', c.req.header('HX-Trigger') || null)
      c.set('htmx.triggerName', c.req.header('HX-Trigger-Name') || null)
    }

    await next()
  }
}
