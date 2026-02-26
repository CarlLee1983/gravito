/**
 * @fileoverview Header Token Gate Middleware for Photon
 *
 * Header-based token authentication middleware migrated from @gravito/core.
 * This is the canonical location for header token gating in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { Context, MiddlewareHandler } from 'hono'
/**
 * Options for header token gate
 * @public
 */
export type HeaderTokenGateOptions = {
  headerName?: string
  token?: string | ((c: Context) => string | undefined)
}
/**
 * Options for requireHeaderToken middleware
 * @public
 */
export type RequireHeaderTokenOptions = HeaderTokenGateOptions & {
  status?: number
  message?: string
}
/**
 * Create a simple gate function to check a header token.
 * @public
 */
export declare function createHeaderGate(
  options?: HeaderTokenGateOptions
): (c: Context) => Promise<boolean>
/**
 * Middleware that enforces a specific token in request headers.
 * Useful for internal API authentication.
 * @public
 */
export declare function requireHeaderToken(options?: RequireHeaderTokenOptions): MiddlewareHandler
