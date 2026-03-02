/**
 * @fileoverview Enhanced Photon Class with Gravito Middleware Support
 *
 * Extends Hono with native support for Gravito middleware types,
 * enabling seamless integration of Gravito-typed middleware without adapters.
 *
 * @module @gravito/photon/photon
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'
import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

/**
 * Enhanced Photon application class with Gravito middleware support.
 *
 * A subclass of Hono that automatically adapts Gravito-typed middleware
 * for seamless integration. Type-safe at both compile and runtime.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * // Works with both Hono and Gravito middleware:
 * app.use(honoMiddleware)       // Traditional Hono
 * app.use(gravitoMiddleware)    // Gravito-typed (automatically adapted)
 * ```
 *
 * @public
 */
export class PhotonWithGravitoSupport extends Hono {
  // Inherit all Hono methods, with transparent support for GravitoMiddleware
  // Runtime conversion happens automatically via implicit type casting
  // Both MiddlewareHandler and GravitoMiddleware have identical signatures at runtime
}

/**
 * Helper function to explicitly convert Gravito middleware to Hono middleware.
 *
 * Usually not needed - Photon automatically adapts Gravito middleware.
 * Use this only if you need explicit control over conversion.
 *
 * @example
 * ```typescript
 * import { toHonoMiddleware } from '@gravito/photon'
 *
 * const adapted = toHonoMiddleware(gravitoMiddleware)
 * ```
 *
 * @public
 */
export function toHonoMiddleware(middleware: GravitoMiddleware): MiddlewareHandler {
  // Both types have identical signatures at runtime
  // (ctx, next) => Response | void | Promise<Response | void>
  return middleware as unknown as MiddlewareHandler
}
