import type { GravitoContext, GravitoMiddleware } from '../types'

export type HeaderTokenGateOptions = {
  headerName?: string
  token?: string | ((c: GravitoContext) => string | undefined)
}

export type RequireHeaderTokenOptions = HeaderTokenGateOptions & {
  status?: number
  message?: string
}

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
