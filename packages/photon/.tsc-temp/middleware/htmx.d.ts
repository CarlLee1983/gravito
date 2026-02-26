import type { MiddlewareHandler } from 'hono'
/**
 * HTMX Middleware for Photon.
 *
 * Automatically detects HTMX requests and populates the context with
 * HTMX-specific headers and state.
 *
 * @remarks
 * This middleware enables hypermedia-driven UIs by providing first-class
 * support for HTMX. It allows handlers to easily distinguish between
 * full-page loads and partial updates.
 *
 * @returns A Hono middleware handler that populates HTMX context variables.
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
 *   // Check if request is from HTMX
 *   if (c.get('htmx')) {
 *     return c.html('<div>Search results...</div>')
 *   }
 *
 *   return c.html('<html>...</html>')
 * })
 * ```
 *
 * @context_variables
 * - `htmx`: Boolean indicating if the request is an HTMX request.
 * - `htmx.boosted`: Boolean indicating if the request was boosted.
 * - `htmx.target`: The ID of the target element.
 * - `htmx.trigger`: The ID of the trigger element.
 */
export declare const htmxMiddleware: () => MiddlewareHandler
