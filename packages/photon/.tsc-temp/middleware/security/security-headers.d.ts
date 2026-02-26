/**
 * @fileoverview Security Headers Middleware for Photon
 *
 * Helmet-style security headers middleware migrated from @gravito/core.
 * This is the canonical location for security headers middleware in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { Context, MiddlewareHandler } from 'hono'
/**
 * HSTS Configuration
 * @public
 */
export type HstsOptions = {
  maxAge: number
  includeSubDomains?: boolean
  preload?: boolean
}
/**
 * Options for Security Headers middleware
 * @public
 */
export type SecurityHeadersOptions = {
  contentSecurityPolicy?: string | false | ((c: Context) => string | false)
  frameOptions?: string | false
  referrerPolicy?: string | false
  noSniff?: boolean
  hsts?: HstsOptions | false
  permissionsPolicy?: string | false
  crossOriginOpenerPolicy?: string | false
  crossOriginResourcePolicy?: string | false
}
/**
 * Apply common security headers to responses (Helmet-style).
 * @public
 */
export declare function securityHeaders(options?: SecurityHeadersOptions): MiddlewareHandler
