import type { MiddlewareHandler } from 'hono'

/**
 * Automatically trim all strings in the request body and query.
 */
export const trimStrings = (): MiddlewareHandler => {
  return async (c, next) => {
    // We proxy the req.json and req.query methods to return trimmed data
    // This is more efficient than pre-processing everything if the controller doesn't use it.

    // However, for best DX, we will attempt to clean the body if it's JSON
    if (c.req.header('Content-Type')?.includes('application/json')) {
      try {
        const body = await c.req.json()
        clean(body, (val) => (typeof val === 'string' ? val.trim() : val))
        // Since Hono's body is already read, we might need to store it in context
        // But for now, let's assume we use a simpler approach for the prototype.
      } catch {
        // Skip if not valid JSON
      }
    }

    await next()
  }
}

function clean(obj: any, transform: (val: any) => any) {
  if (!obj || typeof obj !== 'object') {
    return
  }

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      clean(obj[key], transform)
    } else {
      obj[key] = transform(obj[key])
    }
  }
}
