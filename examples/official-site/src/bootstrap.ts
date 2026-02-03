import { join } from 'node:path'
import { defineConfig, GravitoEngineAdapter as GravitoAdapter, PlanetCore } from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import type { Context, Next } from 'hono'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'
import { proxyToVite } from './utils/vite'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}): Promise<PlanetCore> {
  const { port = 3000, name = 'Gravito App', version = '1.0.0' } = options

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    // Add OrbitIon
    orbits: [
      new OrbitCache(),
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

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  const app = (core as any).app

  // 4. Setup Vite Proxy IMMEDIATELY (Using bottom-level adapter for reliability)
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
  }

  // 5. Set isDev flag
  if (process.env.NODE_ENV !== 'production') {
    app.use('*', async (c: any, next: any) => {
      c.set('isDev', true)
      return await next()
    })
  }

  const staticPath = join(import.meta.dirname, '../static/favicon.ico')

  app.get('/test-ping', (c: any) => c.text('PONG'))

  // Use direct Bun.file for optimized static serving in standalone engine
  app.get('/favicon.ico', () => new Response(Bun.file(staticPath)))

  // For other static files, we can use a simple middleware for now
  app.get('/static/*', async (c: any) => {
    const rawUrl = c.req.url
    const urlObj = new URL(rawUrl, 'http://localhost')
    const pathName = urlObj.pathname
    const relativePath = pathName.replace(/^\/static\//, '')
    const absFilePath = join(process.cwd(), 'static', relativePath)

    const bunFile = Bun.file(absFilePath)
    if (await bunFile.exists()) {
      return new Response(bunFile)
    }

    return c.notFound()
  })

  // 3.1 SEO Middleware
  const { gravitoSeo } = await import('@gravito/luminosity-adapter-photon')
  const { seoConfig } = await import('./config/seo')
  app.use('*', gravitoSeo(seoConfig))

  // 3.2 Google Analytics Injection
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
             <script>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              </script>`
        )
        c.res = new Response(html, c.res)
      }
    }
  })

  // 6. Hooks
  registerHooks(core)

  // 7. Routes (registered after Vite proxy to avoid 404 on Vite assets)
  registerRoutes(core)

  return core
}
