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
// Middleware
export { type BodySizeLimitOptions, bodySizeLimit } from './middleware/BodySizeLimit'
export { type CorsOptions, type CorsOrigin, cors } from './middleware/Cors'
export {
  createHeaderGate,
  type HeaderTokenGateOptions,
  type RequireHeaderTokenOptions,
  requireHeaderToken,
} from './middleware/HeaderTokenGate'
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
