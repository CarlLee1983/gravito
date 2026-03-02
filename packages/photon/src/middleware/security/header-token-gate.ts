/**
 * @fileoverview Header Token Gate Middleware for Photon
 *
 * Header-based token authentication middleware migrated from @gravito/core.
 * This is the canonical location for header token gating in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type {
  GravitoContext as Context,
  GravitoMiddleware as MiddlewareHandler,
} from '@gravito/core'

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
export function createHeaderGate(options: HeaderTokenGateOptions = {}) {
  const headerName = options.headerName ?? 'x-admin-token'
  return async (c: Context): Promise<boolean> => {
    const expected =
      typeof options.token === 'function'
        ? options.token(c)
        : (options.token ?? process.env.ADMIN_TOKEN)
    if (!expected) {
      return false
    }
    const provided = c.req.header(headerName)
    return provided === expected
  }
}

/**
 * Middleware that enforces a specific token in request headers.
 * Useful for internal API authentication.
 * @public
 */
export function requireHeaderToken(options: RequireHeaderTokenOptions = {}): MiddlewareHandler {
  const gate = createHeaderGate(options)
  const status = options.status ?? 403
  const message = options.message ?? 'Unauthorized'

  return async (c, next) => {
    if (!(await gate(c))) {
      return c.text(message, status as any)
    }
    await next()
    return undefined
  }
}
