/**
 * @gravito/photon - High-performance web engine for the Gravito Galaxy Architecture.
 *
 * Photon serves as the foundational HTTP layer for Gravito, providing an ultra-fast,
 * type-safe routing system based on Hono. It is designed to be the "light" that
 * connects Satellites (domain plugins) and Orbits (infrastructure) within the ecosystem.
 *
 * Key features:
 * - Zero-overhead routing and middleware.
 * - Full TypeScript inference for request parameters and body.
 * - Built-in support for HTMX and binary (CBOR) protocols.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * app.get('/welcome', (c) => c.text('Welcome to the Galaxy!'))
 *
 * export default app
 * ```
 * @packageDocumentation
 */

export * from 'hono'

/**
 * The primary application class for Photon.
 *
 * An alias for `Hono`, providing the core routing and middleware capabilities.
 * Use this to define your API structure and mount domain-specific Satellites.
 *
 * @remarks
 * Photon extends Hono's capabilities with Gravito-specific optimizations.
 * It serves as the entry point for defining routes, applying middleware,
 * and handling the request-response lifecycle.
 *
 * @example
 * ```typescript
 * const app = new Photon()
 *
 * // Basic routing
 * app.get('/api/health', (c) => c.json({ status: 'ok' }))
 *
 * // Middleware integration
 * app.use('/api/*', myMiddleware)
 *
 * // Mounting sub-routers
 * app.route('/v1', v1Router)
 * ```
 * @public
 */
export { Hono as Photon } from 'hono'

/**
 * Binary-related middleware for Photon.
 *
 * Provides utilities for handling binary data formats like CBOR,
 * optimizing payload size and serialization speed for high-performance APIs.
 *
 * @public
 */
export * from './middleware/binary'

/**
 * HTMX-related middleware for Photon.
 *
 * Enhances Photon with first-class support for HTMX, including
 * automatic request detection and simplified header access for hypermedia-driven UIs.
 *
 * @public
 */
export * from './middleware/htmx'

/**
 * OpenAPI utilities
 * @public
 */
export * from './openapi'
