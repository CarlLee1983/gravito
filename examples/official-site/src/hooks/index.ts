import type { InertiaService } from '@gravito/orbit-inertia'
import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'

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
  core.hooks.addFilter('api:response', async (data) => ({
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
    const c = args[0] as Context
    const inertia = c.get('inertia') as InertiaService
    if (inertia) {
      return inertia.render('Error', { status: 404 })
    }
  })

  // Handle 500 Internal Server Error
  core.hooks.addFilter('error:render', async (_initial, ...args) => {
    const c = args[0] as Context
    const inertia = c.get('inertia') as InertiaService
    // Optionally extract status from error if available in context
    const error = c.error as { status?: number } | undefined
    const status = typeof error?.status === 'number' ? error.status : 500

    if (inertia) {
      return inertia.render('Error', {
        status,
        message:
          process.env.NODE_ENV === 'production'
            ? undefined
            : c.error?.message || 'Unknown distortion in space-time',
      })
    }
  })
}
