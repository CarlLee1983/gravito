import type { PlanetCore } from 'gravito-core'
import type { Context, Next } from '@gravito/photon'
import { ApiController } from '../controllers/ApiController'
import { HomeController } from '../controllers/HomeController'

/**
 * Route Definitions
 *
 * Maps URLs to controller methods using the Gravito Router.
 * Supports groups, prefixes, and domains.
 */
export function registerRoutes(core: PlanetCore): void {
  const router = core.router

  // ─────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────
  router.get('/', [HomeController, 'index'])
  router.get('/about', [HomeController, 'about'])

  // ─────────────────────────────────────────────
  // API Routes
  // ─────────────────────────────────────────────
  // Example inline middleware for API logging
  const apiLogger = async (c: Context, next: Next) => {
    console.log(`[API] ${c.req.method} ${c.req.url}`)
    await next()
  }

  router
    .prefix('/api')
    .middleware(apiLogger)
    .group((api) => {
      api.get('/health', [ApiController, 'health'])
      api.get('/config', [ApiController, 'config'])
      api.get('/stats', [ApiController, 'stats'])
    })
}
