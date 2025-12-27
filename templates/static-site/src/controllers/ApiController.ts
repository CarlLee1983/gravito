import type { CacheService, GravitoContext, PlanetCore } from 'gravito-core'

const startTime = Date.now()

/**
 * ApiController
 * Handles all API endpoints
 */
export class ApiController {
  [key: string]: unknown

  constructor(private core: PlanetCore) {}

  /**
   * GET /api/health
   * Health check endpoint
   */
  health = async (ctx: GravitoContext) => {
    const response = await this.core.hooks.applyFilters('api:response', {
      status: 'healthy',
      service: this.core.config.get('APP_NAME'),
    })
    return ctx.json(response)
  }

  /**
   * GET /api/config
   * Application configuration
   */
  config = async (ctx: GravitoContext) => {
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
    return ctx.json(response)
  }

  /**
   * GET /api/stats
   * Server statistics
   */
  stats = async (ctx: GravitoContext) => {
    const cache = ctx.get('cache') as CacheService | undefined
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
    return ctx.json(response)
  }
}
