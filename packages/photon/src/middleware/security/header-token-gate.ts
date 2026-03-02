/**
 * @fileoverview Header Token Gate Middleware for Photon
 *
 * Header-based token authentication middleware migrated from @gravito/core.
 * This is the canonical location for header token gating in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import crypto from 'node:crypto'

import type { GravitoContext as Context, GravitoMiddleware } from '@gravito/core'
import type { MiddlewareHandler } from 'hono'
import { asHonoMiddleware } from '../../middleware-adapter'

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      return false
    }
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

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
 * Uses timing-safe comparison to prevent timing attacks.
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
    return timingSafeCompare(provided ?? '', expected)
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

  const middleware: GravitoMiddleware = async (c, next) => {
    if (!(await gate(c))) {
      return c.text(message, status)
    }
    await next()
  }

  return asHonoMiddleware(middleware)
}
