import type { InertiaService } from '@gravito/ion'
import type { Context } from '@gravito/photon'
import type { PlanetCore } from 'gravito-core'

/**
 * Register application hooks
 * Hooks allow you to modify behavior without changing core code
 */
export function registerHooks(core: PlanetCore): void {
  // Log when app starts
  core.hooks.addAction('app:liftoff', (args) => {
    const { port } = args as { port: number }
    core.logger.info(`🌌 ${core.config.get('APP_NAME')} is ready at http://localhost:${port}`)
  })

  // Add metadata to all API responses
  core.hooks.addFilter<Record<string, unknown>>('api:response', async (data) => ({
    ...data,
    _meta: {
      timestamp: new Date().toISOString(),
      poweredBy: 'Gravito',
    },
  }))

  // ─────────────────────────────────────────────
  // Custom Error Pages (Cosmic Theme)
  // ─────────────────────────────────────────────

  // Handle 404 Not Found
  core.hooks.addFilter('notFound:render', async (_initial, ...args) => {
    // args[0] is ErrorHandlerContext, not Context directly
    const context = args[0] as { c: Context }
    const c = context.c
    const inertia = c.get('inertia') as InertiaService

    // Only intercept if this is an Inertia request or we want to render HTML
    // But OrbitIon typically handles all HTML requests if installed
    if (inertia) {
      return inertia.render('Error', { status: 404 })
    }
  })

  // Handle 500 Internal Server Error
  core.hooks.addFilter('error:render', async (_initial, ...args) => {
    const context = args[0] as { c: Context; error: unknown }
    const c = context.c
    const inertia = c.get('inertia') as InertiaService

    // Optionally extract status from error if available in context
    const error = context.error as { status?: number; message?: string } | undefined
    const status = typeof error?.status === 'number' ? error.status : 500

    if (inertia) {
      return inertia.render('Error', {
        status,
        message:
          process.env.NODE_ENV === 'production'
            ? undefined
            : error?.message ||
              (error instanceof Error ? error.message : undefined) ||
              'Unknown distortion in space-time',
      })
    }
  })
}
