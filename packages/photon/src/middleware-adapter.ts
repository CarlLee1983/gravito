/**
 * @fileoverview Middleware Utility for Photon
 *
 * Provides middleware helper functions for Gravito-based applications.
 * Since Photon now uses Gravito middleware natively, adapters are minimal.
 *
 * @module @gravito/photon/middleware-adapter
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Identity middleware adapter.
 * Since Photon now uses GravitoMiddleware directly, no adaptation is needed.
 *
 * @param middleware - Gravito-typed middleware function
 * @returns The same middleware (no-op adapter for backwards compatibility)
 *
 * @internal
 */
export function asGravitoMiddleware(middleware: GravitoMiddleware): GravitoMiddleware {
  return middleware
}

// Re-export for backwards compatibility
export const asHonoMiddleware = asGravitoMiddleware
