import { join } from 'node:path'
import { defineConfig, GravitoEngineAdapter as GravitoAdapter, PlanetCore } from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import type { Context, Next } from 'hono'
// Import Controllers
import { ApiController } from './controllers/ApiController'
import { DocsController } from './controllers/DocsController'
import { HomeController } from './controllers/HomeController'
import { registerHooks } from './hooks'
import { ResilienceOrbit } from './orbits/ResilienceOrbit'
import { proxyToVite } from './utils/vite'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}): Promise<PlanetCore> {
  const { port = 3000, name = 'Gravito Official', version = '1.0.0-singularity' } = options

  // 1. Configure Host
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    orbits: [
      new OrbitCache(),
      new ResilienceOrbit({
        circuitBreaker: { threshold: 5, timeout: 10000 },
      }),
      new OrbitPrism({
        cache: {
          enabled: process.env.NODE_ENV === 'production',
          maxSize: 1000,
        },
      }),
      new OrbitIon(),
    ],
    adapter: new GravitoAdapter(),
  })

  // 2. Boot PlanetCore
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Register Satellite Handlers & Routes (Manual Galaxy Mapping)
  registerSatellites(core)

  // 4. Global Middlewares
  setupGlobalMiddlewares(core)

  // 5. Hooks
  registerHooks(core)

  return core
}

function registerSatellites(core: PlanetCore) {
  const router = core.router

  const setLocale = (locale: string) => async (c: any, next: any) => {
    c.set('locale', locale)
    return await next()
  }

  const homeCtrl = new HomeController(core)
  const docsCtrl = new DocsController()
  const apiCtrl = new ApiController(core)

  // Satellite: Content
  router.middleware(setLocale('en')).group((root: any) => {
    root.get('/', (c: any) => homeCtrl.index(c))
    root.get('/about', (c: any) => homeCtrl.about(c))
    root.get('/features', (c: any) => homeCtrl.features(c))
    root.get('/releases', (c: any) => homeCtrl.releases(c))
    root.get('/privacy', (c: any) => homeCtrl.privacy(c))
    root.get('/terms', (c: any) => homeCtrl.terms(c))
  })

  router
    .prefix('/en')
    .middleware(setLocale('en'))
    .group((en: any) => {
      en.get('/', (c: any) => homeCtrl.index(c))
      en.get('/about', (c: any) => homeCtrl.about(c))
      en.get('/features', (c: any) => homeCtrl.features(c))
      en.get('/releases', (c: any) => homeCtrl.releases(c))
    })

  router
    .prefix('/zh')
    .middleware(setLocale('zh'))
    .group((zh: any) => {
      zh.get('/', (c: any) => homeCtrl.index(c))
      zh.get('/about', (c: any) => homeCtrl.about(c))
      zh.get('/features', (c: any) => homeCtrl.features(c))
      zh.get('/releases', (c: any) => homeCtrl.releases(c))
    })

  // Satellite: Docs
  router.middleware(setLocale('en')).group((enDocs: any) => {
    enDocs.get('/docs', (c: any) => docsCtrl.index(c))
    enDocs.get('/en/docs', (c: any) => docsCtrl.index(c))
    enDocs.get('/docs/*', (c: any) => docsCtrl.show(c))
    enDocs.get('/en/docs/*', (c: any) => docsCtrl.show(c))
  })

  router.middleware(setLocale('zh')).group((zhDocs: any) => {
    zhDocs.get('/zh/docs', (c: any) => docsCtrl.index(c))
    zhDocs.get('/zh/docs/*', (c: any) => docsCtrl.show(c))
    zhDocs.get('/zh-TW/docs', (c: any) => docsCtrl.index(c))
    zhDocs.get('/zh-TW/docs/*', (c: any) => docsCtrl.show(c))
  })

  // Satellite: API
  router.prefix('/api').group((api: any) => {
    api.get('/health', (c: any) => apiCtrl.health(c))
    api.get('/config', (c: any) => apiCtrl.config(c))
    api.get('/stats', (c: any) => apiCtrl.stats(c))
  })

  router.post('/newsletter', (c: any) => homeCtrl.subscribe(c))
}

function setupGlobalMiddlewares(core: PlanetCore) {
  const app = (core as any).app

  if (process.env.NODE_ENV !== 'production') {
    core.adapter.use('*', async (c: any, next: any) => {
      const url = new URL(c.req.url)
      const p = url.pathname
      const isViteAsset =
        p.startsWith('/@') ||
        p.startsWith('/node_modules/') ||
        p.startsWith('/src/') ||
        p.includes('react-refresh')
      if (isViteAsset) {
        const result = await proxyToVite(c, core)
        if (result) {
          return result
        }
      }
      return await next()
    })
  }

  app.get('/test-ping', (c: any) => c.text('PONG'))
  app.get('/api/v1/health', (c: any) => c.json({ status: 'active', galaxy: 'singularity' }))

  // Static Assets
  app.get('/static/*', async (c: any) => {
    const absFilePath = join(process.cwd(), 'static', c.req.path.replace(/^\/static\//, ''))
    const bunFile = Bun.file(absFilePath)
    if (await bunFile.exists()) {
      return new Response(bunFile)
    }
    return c.notFound()
  })

  setupAnalytics(core)
}

async function setupAnalytics(core: PlanetCore) {
  const app = (core as any).app
  const { gravitoSeo } = await import('@gravito/luminosity-adapter-photon')
  const { seoConfig } = await import('./config/seo')
  app.use('*', gravitoSeo(seoConfig))

  app.use('*', async (c: Context, next: Next) => {
    await next()
    const gaId = process.env.VITE_GA_ID
    if (gaId && c.res && c.res.status === 200) {
      const contentType = c.res.headers.get('Content-Type')
      if (contentType?.includes('text/html')) {
        let html = await c.res.text()
        html = html.replace(
          '<!-- Google Analytics Placeholder -->',
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${gaId}');</script>`
        )
        c.res = new Response(html, c.res)
      }
    }
  })
}
