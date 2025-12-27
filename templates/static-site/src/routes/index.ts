import type { GravitoContext, GravitoMiddleware, PlanetCore } from 'gravito-core'
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
  const apiLogger: GravitoMiddleware = async (ctx, next) => {
    console.log(`[API] ${ctx.req.method} ${ctx.req.url}`)
    await next()
    return undefined
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
