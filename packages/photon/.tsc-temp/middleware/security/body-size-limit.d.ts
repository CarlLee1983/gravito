/**
 * @fileoverview Body Size Limit Middleware for Photon
 *
 * Request body size limiting middleware migrated from @gravito/core.
 * This is the canonical location for body size limiting in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { MiddlewareHandler } from 'hono'
/**
 * Options for body size limiting
 * @public
 */
export type BodySizeLimitOptions = {
  methods?: string[]
  requireContentLength?: boolean
}
/**
 * Middleware to limit request body size.
 * @param maxBytes - Maximum allowed size in bytes
 * @param options - Configuration options
 * @public
 */
export declare function bodySizeLimit(
  maxBytes: number,
  options?: BodySizeLimitOptions
): MiddlewareHandler
