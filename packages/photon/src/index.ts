/**
 * @gravito/photon - High-performance web framework for Gravito.
 *
 * Photon is the primary web engine for Gravito, providing a fast,
 * flexible, and standard-compliant API for building web applications.
 * It includes enterprise-grade middleware and utilities designed
 * for the Gravito ecosystem.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * const app = new Photon()
 * app.get('/', (c) => c.text('Hello!'))
 * ```
 */
export * from 'hono'
export { Hono as Photon } from 'hono'
/**
 * Binary-related middleware for Photon.
 */
export * from './middleware/binary'
/**
 * HTMX-related middleware for Photon.
 */
export * from './middleware/htmx'
