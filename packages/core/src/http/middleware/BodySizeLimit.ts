import type { GravitoMiddleware } from '../types'

export type BodySizeLimitOptions = {
  methods?: string[]
  requireContentLength?: boolean
}

const defaultMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

export function bodySizeLimit(
  maxBytes: number,
  options: BodySizeLimitOptions = {}
): GravitoMiddleware {
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
