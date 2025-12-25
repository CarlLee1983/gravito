/**
 * @fileoverview Type Compatibility Layer
 *
 * This module provides type aliases for backward compatibility with
 * code that directly imports from Photon. Users can gradually migrate
 * to the Gravito abstractions.
 *
 * @module @gravito/core/compat
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * // Before (Photon-coupled):
 * import type { Context, MiddlewareHandler } from '@gravito/photon'
 *
 * // After (Gravito abstraction):
 * import type { GravitoContext, GravitoMiddleware } from 'gravito-core'
 *
 * // Or using compat aliases during migration:
 * import type { Context, MiddlewareHandler } from 'gravito-core/compat'
 * ```
 */

// Re-export Gravito types with Photon-style aliases for migration
// Also export Gravito types with their proper names for those who want to use both
export type {
  ContentfulStatusCode,
  GravitoContext as Context,
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler as Handler,
  GravitoHandler,
  GravitoMiddleware as MiddlewareHandler,
  GravitoMiddleware,
  GravitoNext as Next,
  GravitoNext,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables as Variables,
  GravitoVariables,
  HttpMethod,
  StatusCode,
  ValidationTarget,
} from './http/types'
