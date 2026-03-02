/**
 * @fileoverview Middleware Type Adapter for Photon
 *
 * Provides bidirectional type compatibility between Gravito and Hono middleware.
 * This enables Gravito-typed middleware to work seamlessly within Photon/Hono applications.
 *
 * @module @gravito/photon/middleware-adapter
 * @internal
 */

import type { GravitoContext, GravitoMiddleware, GravitoNext } from '@gravito/core'
import type { Context as HonoContext, MiddlewareHandler } from 'hono'

/**
 * Adapts a GravitoMiddleware to a Hono MiddlewareHandler.
 *
 * This function bridges the type gap between Gravito's middleware interface
 * and Hono's, allowing Gravito-typed middleware to be used with Photon/Hono.
 *
 * @param middleware - Gravito-typed middleware function
 * @returns Hono-compatible middleware handler
 *
 * @example
 * ```typescript
 * import { adaptMiddleware } from '@gravito/photon/middleware-adapter'
 * import { myGravitoMiddleware } from './my-middleware'
 *
 * const app = new Photon()
 * app.use(adaptMiddleware(myGravitoMiddleware))
 * ```
 *
 * @internal
 */
export function adaptMiddleware(middleware: GravitoMiddleware): MiddlewareHandler {
  return async (honoContext: HonoContext, next) => {
    // Cast Hono context to GravitoContext
    // Both interfaces provide the same API, just different type names
    const gravitoContext = honoContext as unknown as GravitoContext

    // Create a GravitoNext that wraps Hono's next
    const gravitoNext: GravitoNext = async () => {
      await next()
      return undefined
    }

    // Call the Gravito middleware
    const result = await middleware(gravitoContext, gravitoNext)

    // Return the result to Hono
    return result
  }
}

/**
 * Type assertion helper for middleware.
 *
 * Used internally to help TypeScript understand that Gravito and Hono
 * middleware types are structurally compatible.
 *
 * @internal
 */
export function asHonoMiddleware(middleware: GravitoMiddleware): MiddlewareHandler {
  return middleware as unknown as MiddlewareHandler
}
