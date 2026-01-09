import type { GravitoContext, GravitoNext, PlanetCore } from '@gravito/core'
import { ApiController } from '../controllers/ApiController'
import { DocsController } from '../controllers/DocsController'
import { HomeController } from '../controllers/HomeController'

export function registerRoutes(core: PlanetCore): void {
  const router = core.router

  // Middleware to set locale
  const setLocale = (locale: string) => async (c: GravitoContext, next: GravitoNext) => {
    c.set('locale', locale)
    return (await next()) as any
  }

  // ─────────────────────────────────────────────
  // Default Routes (English)
  // ─────────────────────────────────────────────
  router.middleware(setLocale('en')).group((root: any) => {
    root.get('/', [HomeController, 'index'])
    // Specific route for docs index
    root.get('/docs', [DocsController, 'index'])
    // Wildcard for docs pages
    root.get('/docs/*', [DocsController, 'show'])
    root.get('/about', [HomeController, 'about'])
    root.get('/features', [HomeController, 'features'])
    root.get('/releases', [HomeController, 'releases'])
    root.get('/privacy', [HomeController, 'privacy'])
    root.get('/terms', [HomeController, 'terms'])
  })

  // ─────────────────────────────────────────────
  // Explicit English Routes (/en)
  // ─────────────────────────────────────────────
  router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en: any) => {
      en.get('', [HomeController, 'index'])
      en.get('/', [HomeController, 'index'])
      en.get('/docs', [DocsController, 'index'])
      en.get('/docs/*', [DocsController, 'show'])
      en.get('/about', [HomeController, 'about'])
      en.get('/features', [HomeController, 'features'])
      en.get('/releases', [HomeController, 'releases'])
      en.get('/privacy', [HomeController, 'privacy'])
      en.get('/terms', [HomeController, 'terms'])
    })

  // ─────────────────────────────────────────────
  // Chinese Routes (/zh and /zh-TW)
  // ─────────────────────────────────────────────
  const registerChineseRoutes = (group: any) => {
    group.get('', [HomeController, 'index'])
    group.get('/', [HomeController, 'index'])
    group.get('/docs', [DocsController, 'index'])
    group.get('/docs/*', [DocsController, 'show'])
    group.get('/about', [HomeController, 'about'])
    group.get('/features', [HomeController, 'features'])
    group.get('/releases', [HomeController, 'releases'])
    group.get('/privacy', [HomeController, 'privacy'])
    group.get('/terms', [HomeController, 'terms'])
  }

  router.prefix('/zh').middleware(setLocale('zh')).group(registerChineseRoutes)

  router.prefix('/zh-TW').middleware(setLocale('zh')).group(registerChineseRoutes)

  // Newsletter
  router.post('/newsletter', [HomeController, 'subscribe'])

  // ─────────────────────────────────────────────
  // API Routes
  // ─────────────────────────────────────────────
  const apiLogger = async (c: GravitoContext, next: GravitoNext) => {
    console.log(`[API] ${c.req.method} ${c.req.url}`)
    return (await next()) as any
  }

  router
    .prefix('/api')
    .middleware(apiLogger)
    .group((api: any) => {
      api.get('/health', [ApiController, 'health'])
    })
}
