/**
 * High-performance HTTP engine for the Gravito Galaxy Architecture.
 *
 * Photon serves as the foundational web layer for Gravito, enabling developers to build
 * type-safe, high-throughput web applications with minimal boilerplate. By aliasing Hono
 * as Photon, we maintain consistent naming conventions across the Gravito ecosystem while
 * leveraging Hono's battle-tested performance and standard-compliant Web API surface.
 *
 * **Design Rationale:**
 * - **Unified Naming**: `Photon` aligns with Gravito's celestial architecture terminology
 *   (Core → Orbits → Satellites → Photon for communication).
 * - **Zero-Cost Abstraction**: Direct re-export ensures no runtime overhead while providing
 *   a future-proof API surface for potential Gravito-specific enhancements.
 * - **Ecosystem Consistency**: Developers work with `Photon` instances throughout the stack,
 *   creating a coherent mental model from framework entry point to middleware composition.
 *
 * **Use Cases:**
 * - Building high-performance REST APIs for Gravito Satellites (business modules)
 * - Serving SSR applications with `@gravito/prism` view engine integration
 * - Creating RPC endpoints with `@gravito/beam` type-safe client/server communication
 * - Developing real-time applications with WebSocket support in Gravito Orbits
 *
 * @module @gravito/photon
 *
 * @example
 * Basic HTTP server with routing
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * app.get('/', (c) => c.text('Hello from Photon!'))
 * app.get('/api/users/:id', async (c) => {
 *   const id = c.req.param('id')
 *   return c.json({ id, name: 'John Doe' })
 * })
 *
 * export default app
 * ```
 *
 * @example
 * Integration with Gravito Core ecosystem
 * ```typescript
 * import { PlanetCore, defineConfig, GravitoAdapter } from '@gravito/core'
 * import { htmxMiddleware, binaryMiddleware } from '@gravito/photon'
 *
 * const config = defineConfig({
 *   config: { PORT: 3000 },
 *   adapter: new GravitoAdapter()
 * })
 *
 * const core = await PlanetCore.boot(config)
 *
 * // Access Photon instance through core
 * core.app.use(htmxMiddleware())
 * core.app.use('/api/*', binaryMiddleware())
 *
 * core.app.get('/health', (c) => c.json({ status: 'ok' }))
 *
 * export default core.liftoff()
 * ```
 */
export * from 'hono'

/**
 * Primary HTTP engine class aliased from Hono for Gravito ecosystem consistency.
 *
 * This alias enables unified terminology across all Gravito packages while maintaining
 * full compatibility with Hono's API. Developers can use `Photon` throughout their
 * Gravito applications without mixing framework nomenclature.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.get('/', (c) => c.text('Powered by Photon'))
 * ```
 */
export { Hono as Photon } from 'hono'

/**
 * Binary encoding middleware utilities.
 *
 * Provides CBOR (Concise Binary Object Representation) encoding for JSON responses,
 * enabling 2-3x faster serialization and 20-40% smaller payload sizes compared to
 * standard JSON. Critical for high-throughput APIs serving large datasets.
 *
 * Exports: `binaryMiddleware()`
 *
 * @see {@link ./middleware/binary} for implementation details
 *
 * @example
 * ```typescript
 * import { Photon, binaryMiddleware } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.use(binaryMiddleware())
 *
 * // Automatically returns CBOR when Accept: application/cbor header is present
 * app.get('/api/data', (c) => c.json({ items: [...] }))
 * ```
 */
export * from './middleware/binary'

/**
 * HTMX integration middleware utilities.
 *
 * Detects HTMX requests and provides convenient access to HTMX-specific headers
 * for building hypermedia-driven applications. Enables conditional rendering of
 * full pages vs. HTML fragments based on request origin.
 *
 * Exports: `htmxMiddleware()`
 *
 * @see {@link ./middleware/htmx} for implementation details
 *
 * @example
 * ```typescript
 * import { Photon, htmxMiddleware } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.use(htmxMiddleware())
 *
 * app.get('/search', (c) => {
 *   if (c.get('htmx')) {
 *     return c.html('<div>Partial results...</div>')
 *   }
 *   return c.html('<html>...</html>')
 * })
 * ```
 */
export * from './middleware/htmx'
