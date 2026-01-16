import type { GravitoMiddleware, PlanetCore, RouteGroup, Router } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
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

  // Middleware to set locale
  const setLocale =
    (locale: string): GravitoMiddleware =>
    async (c, next) => {
      c.set('locale', locale)
      const inertia = c.get('inertia') as InertiaHelper | undefined
      if (inertia) {
        inertia.share('locale', locale)
        inertia.share('ga_id', process.env.VITE_GA_MEASUREMENT_ID)
      }
      await next()
      return undefined
    }

  // Helper to register routes for a locale
  const registerRoutesForLocale = (group: Router | RouteGroup, _locale: string) => {
    group.get('', [HomeController, 'index'])
    group.get('/', [HomeController, 'index'])
    group.get('/about', [HomeController, 'about'])
    group.get('/features', [HomeController, 'features'])
    group.get('/integrations', [HomeController, 'integrations'])
    group.get('/privacy', [HomeController, 'privacy'])
    group.get('/terms', [HomeController, 'terms'])
    group.get('/contact', [HomeController, 'contact'])
  }

  // ─────────────────────────────────────────────
  // Default Routes (English)
  // ─────────────────────────────────────────────
  router.middleware(setLocale('en')).group((root: Router | RouteGroup) => {
    registerRoutesForLocale(root, 'en')
  })

  // ─────────────────────────────────────────────
  // Explicit English Routes (/en)
  // ─────────────────────────────────────────────
  router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en: Router | RouteGroup) => {
      registerRoutesForLocale(en, 'en')
    })

  // ─────────────────────────────────────────────
  // Traditional Chinese Routes (/zh-TW)
  // ─────────────────────────────────────────────
  router
    .prefix('/zh-TW')
    .middleware(setLocale('zh-TW'))
    .group((zhTW: Router | RouteGroup) => {
      registerRoutesForLocale(zhTW, 'zh-TW')
    })

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
