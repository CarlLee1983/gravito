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
 * Rate limiting middleware for Photon.
 *
 * Provides built-in rate limiting with token bucket and sliding window strategies.
 * Supports both memory-based and custom storage backends.
 *
 * @public
 */
export * from './middleware/ratelimit'
/**
 * Redis-based rate limiting storage.
 * @public
 */
export * from './middleware/ratelimit-redis'
/**
 * Security middleware for Photon.
 *
 * Provides HTTP security utilities migrated from `@gravito/core`:
 * CORS, CSRF protection, security headers, body size limiting,
 * header token gating, and request throttling.
 *
 * @public
 */
export * from './middleware/security'
export * from './middleware-adapter'
/**
 * OpenAPI utilities
 * @public
 */
export * from './openapi'
export * from './photon'
/**
 * The primary application class for Photon.
 *
 * Enhanced Hono with native Gravito middleware support.
 * Automatically adapts both Hono and Gravito-typed middleware.
 *
 * Use this to define your API structure and mount domain-specific Satellites.
 *
 * @remarks
 * Photon extends Hono's capabilities with:
 * - Native support for Gravito-typed middleware (no adapters needed)
 * - Full Hono middleware compatibility (existing code works as-is)
 * - Type-safe routing and middleware integration
 * - Gravito-specific optimizations for Satellite integration
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * // Basic routing
 * app.get('/api/health', (c) => c.json({ status: 'ok' }))
 *
 * // Works with both Hono and Gravito middleware
 * app.use('/api/*', honoMiddleware)        // Traditional Hono
 * app.use('/api/*', gravitoMiddleware)    // Gravito-typed
 *
 * // Mounting sub-routers
 * app.route('/v1', v1Router)
 * ```
 * @public
 */
export { PhotonWithGravitoSupport as Photon } from './photon'
