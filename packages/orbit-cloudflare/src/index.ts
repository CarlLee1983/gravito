import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { Gravito } from '@gravito/core/engine'

/**
 * OrbitCloudflare
 *
 * Automatically binds Cloudflare Worker environment variables (KV, R2, etc.)
 * to the Gravito context and service container.
 */
/**
 * OrbitCloudflare provides seamless integration with the Cloudflare Workers runtime.
 * It automatically maps Cloudflare Environment Bindings (KV, R2, D1, Durable Objects)
 * to the Gravito context, allowing you to access them via `ctx.get('BINDING_NAME')`.
 *
 * @public
 * @since 3.0.0
 */
export const OrbitCloudflare = {
  /** The unique name of the orbit */
  name: 'cloudflare',
  /** Current version of the orbit */
  version: '1.0.0',

  /**
   * Initializes the orbit by registering a global middleware that
   * injects Cloudflare environment bindings into the request context.
   *
   * @param core - The PlanetCore instance.
   */
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
 * Utility type helper for defining standard Cloudflare bindings in Gravito's type system.
 *
 * @example
 * ```typescript
 * declare module '@gravito/core' {
 *   interface GravitoVariables extends CloudflareBindings<{
 *     USERS_KV: KVNamespace;
 *     DOCS_BUCKET: R2Bucket;
 *   }> {}
 * }
 * ```
 * @public
 * @since 3.0.0
 */
export type CloudflareBindings<T extends Record<string, unknown>> = T

/**
 * Configuration for the Cloudflare Worker handler.
 *
 * @public
 * @since 3.0.0
 */
// biome-ignore lint/complexity/noBannedTypes: Placeholder
export type CloudflareOptions = {}

/**
 * A specialized factory that creates a standard Cloudflare Worker entry point
 * (fetch handler) for a Gravito application.
 *
 * @param app - The Gravito application instance.
 * @param _options - Additional Cloudflare-specific options.
 * @returns An object compatible with Cloudflare Worker's default export.
 * @public
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
