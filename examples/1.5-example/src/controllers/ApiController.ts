import type { CacheService, PlanetCore } from 'gravito-core'
import type { Context } from 'hono'

const startTime = Date.now()

/**
 * ApiController
 * Handles all API endpoints
 */
export class ApiController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/health
   * Health check endpoint
   */
  health = async (c: Context) => {
    const response = await this.core.hooks.applyFilters('api:response', {
      status: 'healthy',
      service: this.core.config.get('APP_NAME'),
    })
    return c.json(response)
  }

  /**
   * GET /api/config
   * Application configuration
   */
  config = async (c: Context) => {
    const response = await this.core.hooks.applyFilters('api:response', {
      app: {
        name: this.core.config.get('APP_NAME'),
        version: this.core.config.get('APP_VERSION'),
      },
      environment: {
        runtime: 'Bun',
        port: this.core.config.get('PORT'),
      },
    })
    return c.json(response)
  }

  /**
   * GET /api/stats
   * Server statistics
   */
  stats = async (c: Context) => {
    const cache = c.get('cache') as CacheService | undefined
    const uptimeMs = Date.now() - startTime
    const uptimeSeconds = Math.floor(uptimeMs / 1000)
    const minutes = Math.floor(uptimeSeconds / 60)
    const seconds = uptimeSeconds % 60

    const response = await this.core.hooks.applyFilters('api:response', {
      uptime: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
      uptimeMs,
      visitors: (await cache?.get<number>('visitor:count')) ?? 0,
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    })
    return c.json(response)
  }
}
