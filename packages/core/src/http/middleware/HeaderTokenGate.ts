import type { GravitoContext, GravitoMiddleware } from '../types'

/**
 * Options for header token gate
 * @public
 */
export type HeaderTokenGateOptions = {
  headerName?: string
  token?: string | ((c: GravitoContext) => string | undefined)
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
  return async (c: GravitoContext): Promise<boolean> => {
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
export function requireHeaderToken(options: RequireHeaderTokenOptions = {}): GravitoMiddleware {
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
