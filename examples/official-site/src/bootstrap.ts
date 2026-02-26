import { join } from 'node:path'
import { defineConfig, GravitoEngineAdapter as GravitoAdapter, PlanetCore } from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitResilience } from '@gravito/resilience'
import { OrbitCache } from '@gravito/stasis'
import { XenonHost } from '@gravito/xenon'
import type { Context, Next } from 'hono'
// Import Controllers for Satellite Mapping
import { ApiController } from './controllers/ApiController'
import { DocsController } from './controllers/DocsController'
import { HomeController } from './controllers/HomeController'
import { registerHooks } from './hooks'
import { proxyToVite } from './utils/vite'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}): Promise<PlanetCore> {
  const { port = 3000, name = 'Gravito Official', version = '1.0.0-singularity' } = options

  // 1. Galaxy Configuration (Host)
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    orbits: [
      new OrbitCache(),
      new OrbitResilience({
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 10000,
        },
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

  // const app = (core as any).app

  // 3. Initialize Xenon Host (Parallel Satellite Runtime)
  const xenon = new XenonHost(core)

  // 4. Register Satellite Handlers & Middlewares
  const setLocale = (locale: string) => async (c: any, next: any) => {
    c.set('locale', locale)
    return await next()
  }

  xenon.registerMiddlewares({
    'setLocale:en': setLocale('en'),
    'setLocale:zh': setLocale('zh'),
  })

  xenon.registerHandlers({
    'HomeController@index': new HomeController(core).index,
    'HomeController@about': new HomeController(core).about,
    'HomeController@features': new HomeController(core).features,
    'HomeController@releases': new HomeController(core).releases,
    'HomeController@privacy': new HomeController(core).privacy,
    'HomeController@terms': new HomeController(core).terms,
    'HomeController@subscribe': new HomeController(core).subscribe,
    'DocsController@index': new DocsController().index,
    'DocsController@show': new DocsController().show,
    'ApiController@health': new ApiController(core).health,
    'ApiController@config': new ApiController(core).config,
    'ApiController@stats': new ApiController(core).stats,
  })

  // 5. Load Satellites via Manifests
  await xenon.loadSatellite(join(import.meta.dirname, 'satellites/content/manifest.json'))
  await xenon.loadSatellite(join(import.meta.dirname, 'satellites/docs/manifest.json'))
  await xenon.loadSatellite(join(import.meta.dirname, 'satellites/api/manifest.json'))

  // 6. Global Middlewares & Custom Asset Handling
  setupGlobalMiddlewares(core)

  // 7. Hooks
  registerHooks(core)

  return core
}

function setupGlobalMiddlewares(core: PlanetCore) {
  const app = (core as any).app

  // Vite Proxy for Development
  if (process.env.NODE_ENV !== 'production') {
    core.adapter.use('*', async (c: any, next: any) => {
      const url = new URL(c.req.url)
      const p = url.pathname

      const isViteAsset =
        p.startsWith('/@') ||
        p.startsWith('/node_modules/') ||
        p.startsWith('/src/') ||
        p.includes('react-refresh') ||
        ['/app.tsx', '/styles.css', '/freeze.config.ts'].includes(p) ||
        (/\.(ts|tsx|js|jsx|css|json|wasm|png|jpg|jpeg|gif|svg|ico)$/.test(p) &&
          !p.startsWith('/static/'))

      if (isViteAsset) {
        const result = await proxyToVite(c, core)
        if (result) return result
      }
      return await next()
    })

    app.use('*', async (c: any, next: any) => {
      c.set('isDev', true)
      return await next()
    })
  }

  // Static Assets
  app.get(
    '/favicon.ico',
    () => new Response(Bun.file(join(import.meta.dirname, '../static/favicon.ico')))
  )
  app.get('/static/*', async (c: any) => {
    const relativePath = c.req.path.replace(/^\/static\//, '')
    const absFilePath = join(process.cwd(), 'static', relativePath)
    const bunFile = Bun.file(absFilePath)
    if (await bunFile.exists()) return new Response(bunFile)
    return c.notFound()
  })

  // SEO & Analytics
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
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
           <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`
        )
        c.res = new Response(html, c.res)
      }
    }
  })
}
