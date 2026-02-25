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

const defaultMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Middleware to limit request body size.
 * @param maxBytes - Maximum allowed size in bytes
 * @param options - Configuration options
 * @public
 */
export function bodySizeLimit(
  maxBytes: number,
  options: BodySizeLimitOptions = {}
): MiddlewareHandler {
  const allowedMethods = (options.methods ?? defaultMethods).map((m) => m.toUpperCase())

  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    if (!allowedMethods.includes(method)) {
      await next()
      return undefined
    }

    const lengthHeader = c.req.header('Content-Length')
    if (!lengthHeader) {
      if (options.requireContentLength) {
        return c.text('Length Required', 411)
      }
      await next()
      return undefined
    }

    const length = Number(lengthHeader)
    if (Number.isNaN(length)) {
      if (options.requireContentLength) {
        return c.text('Invalid Content-Length', 400)
      }
      await next()
      return undefined
    }

    if (length > maxBytes) {
      return c.text('Payload Too Large', 413)
    }

    await next()
    return undefined
  }
}
