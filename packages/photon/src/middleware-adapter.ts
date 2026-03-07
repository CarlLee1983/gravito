/**
 * @fileoverview Middleware Type Adapter for Photon
 *
 * Provides bidirectional type compatibility between Gravito and Hono middleware.
 * This enables Gravito-typed middleware to work seamlessly within Photon/Hono applications.
 *
 * @module @gravito/photon/middleware-adapter
 * @internal
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Identity function for Gravito middleware.
 *
 * This function accepts a GravitoMiddleware and returns it unchanged.
 * It serves as a type-safe way to ensure middleware implements the correct interface.
 *
 * @param middleware - Gravito-typed middleware function
 * @returns The same middleware function
 *
 * @example
 * ```typescript
 * import { asHonoMiddleware } from '@gravito/photon/middleware-adapter'
 * import { myGravitoMiddleware } from './my-middleware'
 *
 * const app = new Photon()
 * app.use(asHonoMiddleware(myGravitoMiddleware))
 * ```
 *
 * @internal
 */
export function asHonoMiddleware(middleware: GravitoMiddleware): GravitoMiddleware {
  return middleware
}
