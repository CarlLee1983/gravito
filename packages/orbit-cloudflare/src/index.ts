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
    core.adapter.useGlobal(async (ctx: any, next: () => Promise<Response | undefined>) => {
      const env = ctx.env
      if (env) {
        // Proxy context variables to include Cloudflare's env
        // This makes env bindings available via ctx.get() or object destructuring
        for (const [key, value] of Object.entries(env)) {
          ctx.set(key, value)
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
