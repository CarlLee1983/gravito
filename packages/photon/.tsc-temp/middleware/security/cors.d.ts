/**
 * @fileoverview CORS Middleware for Photon
 *
 * Cross-Origin Resource Sharing (CORS) middleware migrated from @gravito/core.
 * This is the canonical location for CORS middleware in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { MiddlewareHandler } from 'hono'
/**
 * Allowed origin(s) configuration.
 * @public
 */
export type CorsOrigin = string | string[] | ((origin: string | undefined) => string | false)
/**
 * Options for CORS middleware
 * @public
 */
export type CorsOptions = {
  origin?: CorsOrigin
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
  optionsSuccessStatus?: number
}
/**
 * Middleware handling Cross-Origin Resource Sharing (CORS).
 * @public
 */
export declare function cors(options?: CorsOptions): MiddlewareHandler
