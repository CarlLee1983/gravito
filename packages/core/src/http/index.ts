/**
 * @fileoverview HTTP Module
 *
 * Export all HTTP-related types, utilities, and components.
 *
 * @module @gravito/core/http
 * @since 2.0.0
 */

export type { CookieOptions } from './CookieJar'

// Cookie Management
export { CookieJar } from './CookieJar'
export { deleteCookie, getCookie, setCookie } from './cookie'
// HTTP Middleware moved to @gravito/photon/middleware (Phase 2.1)
// Import from @gravito/photon instead:
// - bodySizeLimit → @gravito/photon/middleware/body
// - cors → @gravito/photon/middleware/cors
// - createHeaderGate, requireHeaderToken → @gravito/photon/middleware/security
// Core HTTP Types (Gravito Abstractions)
export type {
  ContentfulStatusCode,
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNext,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpMethod,
  StatusCode,
  ValidationTarget,
} from './types'
