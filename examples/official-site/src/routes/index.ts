import type { PlanetCore } from 'gravito-core'
import type { Context, Next } from 'hono'
import { ApiController } from '../controllers/ApiController'
import { DocsController } from '../controllers/DocsController'
import { HomeController } from '../controllers/HomeController'

export function registerRoutes(core: PlanetCore): void {
  const router = core.router

  // Middleware to set locale
  const setLocale = (locale: string) => async (c: Context, next: Next) => {
    c.set('locale', locale)
    await next()
  }

  // ─────────────────────────────────────────────
  // Default Routes (English)
  // ─────────────────────────────────────────────
  router.middleware(setLocale('en')).group((root) => {
    root.get('/', [HomeController, 'index'])
    // Specific route for docs index
    root.get('/docs', [DocsController, 'index'])
    // Wildcard for docs pages
    root.get('/docs/*', [DocsController, 'show'])
  })

  // ─────────────────────────────────────────────
  // Chinese Routes
  // ─────────────────────────────────────────────
  router
    .prefix('/zh')
    .middleware(setLocale('zh'))
    .group((zh) => {
      zh.get('/', [HomeController, 'index'])
      zh.get('/docs', [DocsController, 'index'])
      zh.get('/docs/*', [DocsController, 'show'])
    })

  // Newsletter
  router.post('/newsletter', [HomeController, 'subscribe'])

  // ─────────────────────────────────────────────
  // API Routes
  // ─────────────────────────────────────────────
  const apiLogger = async (c: Context, next: Next) => {
    console.log(`[API] ${c.req.method} ${c.req.url}`)
    await next()
  }

  router
    .prefix('/api')
    .middleware(apiLogger)
    .group((api) => {
      api.get('/health', [ApiController, 'health'])
    })
}
