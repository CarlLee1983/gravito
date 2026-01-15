import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { Gravito } from '@gravito/core/engine'

/**
 * OrbitCloudflare
 *
 * Automatically binds Cloudflare Worker environment variables (KV, R2, etc.)
 * to the Gravito context and service container.
 */
export const OrbitCloudflare = {
  name: 'cloudflare',
  version: '1.0.0',

  async boot(core: any) {
    // 1. Register global middleware to map ctx.env -> ctx variables
    core.adapter.useGlobal(async (ctx: GravitoContext, next: GravitoNext) => {
      const env = ctx.env
      if (env) {
        // Proxy context variables to include Cloudflare's env
        // This makes env bindings available via ctx.get() or object destructuring
        for (const [key, value] of Object.entries(env)) {
          ctx.set(key, value as any)
        }
      }
      return await next()
    })
  },
}

/**
 * Helper to define Cloudflare bindings in GravitoVariables
 *
 * @example
 * declare module '@gravito/core' {
 *   interface GravitoVariables extends CloudflareBindings<{
 *     MY_KV: KVNamespace
 *     MY_BUCKET: R2Bucket
 *   }> {}
 * }
 */
export type CloudflareBindings<T extends Record<string, unknown>> = T

// biome-ignore lint/complexity/noBannedTypes: Placeholder
export type CloudflareOptions = {}

/**
 * Standard Cloudflare Worker handler for Gravito
 */
export const handle = (app: Gravito, _options: CloudflareOptions = {}) => {
  return {
    fetch: async (request: Request, env: any, _executionCtx: ExecutionContext) => {
      // In a real implementation, the adapter would handle env/executionCtx
      // For now, we assume Gravito.fetch is the entry point
      return app.fetch(request)
    },
  }
}
