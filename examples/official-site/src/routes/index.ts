import type { PlanetCore } from 'gravito-core'
import { ApiController } from '../controllers/ApiController'
import { DocsController } from '../controllers/DocsController'
import { HomeController } from '../controllers/HomeController'

export function registerRoutes(core: PlanetCore): void {
  const router = core.router

  // Middleware to set locale
  const setLocale = (locale: string) => async (c: any, next: any) => {
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
    root.get('/about', [HomeController, 'about'])
    root.get('/features', [HomeController, 'features'])
  })

  // ─────────────────────────────────────────────
  // Explicit English Routes (/en)
  // ─────────────────────────────────────────────
  router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en) => {
      en.get('', [HomeController, 'index'])
      en.get('/', [HomeController, 'index'])
      en.get('/docs', [DocsController, 'index'])
      en.get('/docs/*', [DocsController, 'show'])
      en.get('/about', [HomeController, 'about'])
      en.get('/features', [HomeController, 'features'])
    })

  // ─────────────────────────────────────────────
  // Chinese Routes
  // ─────────────────────────────────────────────
  router
    .prefix('/zh')
    .middleware(setLocale('zh'))
    .group((zh) => {
      zh.get('', [HomeController, 'index'])
      zh.get('/', [HomeController, 'index'])
      zh.get('/docs', [DocsController, 'index'])
      zh.get('/docs/*', [DocsController, 'show'])
      zh.get('/about', [HomeController, 'about'])
      zh.get('/features', [HomeController, 'features'])
    })

  // Newsletter
  router.post('/newsletter', [HomeController, 'subscribe'])

  // ─────────────────────────────────────────────
  // API Routes
  // ─────────────────────────────────────────────
  const apiLogger = async (c: any, next: any) => {
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
