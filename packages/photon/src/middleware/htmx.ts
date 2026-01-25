import type { MiddlewareHandler } from 'hono'

/**
 * HTMX request detection and header extraction middleware.
 *
 * Automatically detects HTMX requests via the `HX-Request` header and populates the
 * request context with HTMX-specific metadata. This enables conditional rendering
 * of full pages vs. HTML fragments for hypermedia-driven applications.
 *
 * **Design Rationale:**
 * HTMX applications often need to distinguish between traditional page loads and
 * partial updates. This middleware centralizes that logic, storing all HTMX headers
 * in the context for easy access throughout the request lifecycle.
 *
 * **Use Cases:**
 * - Building server-side rendered (SSR) applications with progressive enhancement
 * - Implementing hypermedia APIs that return HTML fragments for HTMX requests
 * - Conditional rendering based on whether the request originated from HTMX or a browser navigation
 * - Accessing HTMX-specific headers like trigger element, target element, and boosted state
 *
 * **Context Variables Set:**
 * - `c.get('htmx')` - Boolean indicating if request is from HTMX
 * - `c.get('htmx.boosted')` - Whether request was boosted (anchor converted to AJAX)
 * - `c.get('htmx.currentUrl')` - Current URL in the browser
 * - `c.get('htmx.historyRestoreRequest')` - Whether this is a history restoration
 * - `c.get('htmx.prompt')` - User's prompt response if `hx-prompt` was used
 * - `c.get('htmx.request')` - Always true for HTMX requests (same as `c.get('htmx')`)
 * - `c.get('htmx.target')` - ID of the target element for the swap
 * - `c.get('htmx.trigger')` - ID of the element that triggered the request
 * - `c.get('htmx.triggerName')` - Name attribute of the trigger element (if present)
 *
 * @returns Middleware handler that populates HTMX context variables
 *
 * @example
 * Conditional rendering for HTMX requests
 * ```typescript
 * import { Photon, htmxMiddleware } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.use(htmxMiddleware())
 *
 * app.get('/search', async (c) => {
 *   const results = await db.search(c.req.query('q'))
 *
 *   if (c.get('htmx')) {
 *     // Return HTML fragment for HTMX swap
 *     return c.html(`<div>${results.map(r => `<p>${r.title}</p>`).join('')}</div>`)
 *   }
 *
 *   // Return full page for browser navigation
 *   return c.html(`
 *     <!DOCTYPE html>
 *     <html><body><div id="results">...</div></body></html>
 *   `)
 * })
 * ```
 *
 * @example
 * Accessing HTMX-specific headers
 * ```typescript
 * app.post('/submit', async (c) => {
 *   const target = c.get('htmx.target')
 *   const trigger = c.get('htmx.trigger')
 *
 *   console.log(`Request triggered by #${trigger}, targeting #${target}`)
 *
 *   // Process submission and return appropriate fragment
 *   return c.html(`<div id="${target}">Updated content</div>`)
 * })
 * ```
 *
 * @example
 * Handling boosted links
 * ```typescript
 * app.get('/page', (c) => {
 *   if (c.get('htmx.boosted')) {
 *     // This was an anchor tag converted to AJAX by hx-boost
 *     // Return just the content area
 *     return c.html('<main>Page content</main>')
 *   }
 *
 *   // Regular page load, include full layout
 *   return c.html('<!DOCTYPE html><html>...</html>')
 * })
 * ```
 *
 * @see {@link https://htmx.org/reference/#request_headers} HTMX Request Headers Reference
 * @public
 */
export const htmxMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const isHtmx = c.req.header('HX-Request') === 'true'

    c.set('htmx', isHtmx)

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
