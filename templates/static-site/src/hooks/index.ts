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
  core.hooks.addFilter('api:response', async (data) => {
    const payload = (data ?? {}) as Record<string, unknown>
    return {
      ...payload,
      _meta: {
        timestamp: new Date().toISOString(),
        poweredBy: 'Gravito',
      },
    }
  })
}
