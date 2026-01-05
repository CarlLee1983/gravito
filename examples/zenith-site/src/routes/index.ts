import type { GravitoContext, GravitoMiddleware, GravitoNext, PlanetCore } from '@gravito/core'
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
  const setLocale = (locale: string) => async (c: GravitoContext, next: GravitoNext) => {
    c.set('locale', locale)
    const inertia = c.get('inertia')
    if (inertia) {
      ;(inertia as any).share({
        locale,
      })
    }
    return (await next()) as any
  }

  // Helper to register routes for a locale
  const registerRoutesForLocale = (group: any, locale: string) => {
    group.get('', [HomeController, 'index'])
    group.get('/', [HomeController, 'index'])
    group.get('/about', [HomeController, 'about'])
    group.get('/features', [HomeController, 'features'])
    group.get('/integrations', [HomeController, 'integrations'])
  }

  // ─────────────────────────────────────────────
  // Default Routes (English)
  // ─────────────────────────────────────────────
  router.middleware(setLocale('en')).group((root: any) => {
    registerRoutesForLocale(root, 'en')
  })

  // ─────────────────────────────────────────────
  // Explicit English Routes (/en)
  // ─────────────────────────────────────────────
  router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en: any) => {
      registerRoutesForLocale(en, 'en')
    })

  // ─────────────────────────────────────────────
  // Traditional Chinese Routes (/zh-TW)
  // ─────────────────────────────────────────────
  router
    .prefix('/zh-TW')
    .middleware(setLocale('zh-TW'))
    .group((zhTW: any) => {
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
