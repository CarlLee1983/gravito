/**
 * @gravito/photon - High-performance web engine for the Gravito Galaxy Architecture.
 *
 * Photon serves as the foundational HTTP layer for Gravito, providing an ultra-fast,
 * type-safe routing system based on Hono. It is designed to work seamlessly with
 * Gravito's micro-kernel architecture while maintaining full compatibility with
 * the Hono ecosystem.
 *
 * Key Features:
 * - Ultra-fast routing using Radix Tree (Trie)
 * - Built-in support for Gravito-typed middleware
 * - Extensive middleware ecosystem (CORS, JWT, OpenTelemetry, HTMX, etc.)
 * - Native support for Bun runtime
 * - Developer-friendly API similar to Express/Koa
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * // Route handling
 * app.get('/hello', (c) => c.text('Hello Gravito!'))
 *
 * // Middleware usage
 * app.use('/api/*', myMiddleware)        // Traditional Hono
 * app.use('/api/*', gravitoMiddleware)    // Gravito-typed
 *
 * // Mounting sub-routers
 * app.route('/v1', v1Router)
 * ```
 * @public
 */

import type { Context, Handler, MiddlewareHandler, Next } from 'hono'
import { Hono } from 'hono'
import { PhotonWithGravitoSupport } from './photon'

// Export primary application class
export { PhotonWithGravitoSupport as Photon } from './photon'

// Re-export essential Hono types
export type { Context, Handler, MiddlewareHandler, Next }

// Re-export common Hono members for convenience
export { Hono }

/**
 * Default Photon instance factory.
 * @public
 */
export function createPhoton(): PhotonWithGravitoSupport {
  return new PhotonWithGravitoSupport()
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-export common Hono exports to ensure full compatibility.
 * This allows @gravito/photon to be used as a drop-in replacement for hono.
 */
export * from 'hono'
export * from 'hono/csrf'
export { csrf as csrfProtection } from 'hono/csrf'

/**
 * CSRF options.
 * @public
 */
export interface CsrfOptions {
  origin?:
    | string
    | string[]
    | ((origin: string) => boolean | undefined | Promise<boolean | undefined>)
  secFetchSite?: string | string[]
}

/**
 * Helper to get CSRF token from context.
 *
 * Provides compatibility for Gravito ecosystem.
 *
 * @param c - Context
 * @param _options - CSRF options
 * @returns token or undefined
 * @public
 */
export function getCsrfToken(c: Context, _options?: CsrfOptions): string | null {
  // In modern Hono, CSRF token is usually managed via headers/cookies
  // This is a compatibility shim
  return c.req.header('x-csrf-token') || null
}
