import type { GravitoContext } from '@gravito/core'
import type { Gravito } from '@gravito/core/engine'

export type CloudflareOptions = {}

export const handle = (app: Gravito, options: CloudflareOptions = {}) => {
  return {
    fetch: async (request: Request, env: any, ctx: ExecutionContext) => {
      // Inject env and ctx into Gravito
      // We need to use a custom adapter or just rely on Gravito's native fetch
      // Gravito's fetch signature is (request: Request)
      // We might need to extend it to accept env/ctx or pass them via some other way.
      // But standard Gravito.fetch is just Request -> Response.

      // For now, simple pass-through.
      // In a real implementation, we would attach env/ctx to the request or context.
      return app.fetch(request)
    },
  }
}
