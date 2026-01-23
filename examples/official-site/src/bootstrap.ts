import { join } from 'node:path'
import {
  bodySizeLimit,
  defineConfig,
  GravitoEngineAdapter as GravitoAdapter,
  PlanetCore,
  securityHeaders,
} from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import type { Context, Next } from 'hono'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'
import { setupViteProxy } from './utils/vite'

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

  const app = core.app as any // Gravito instance

  // 4. Set isDev flag for development mode (Vite proxy will be set up later)
  if (process.env.NODE_ENV !== 'production') {
    const app = core.app as any
    // Use .use('*') to register as middleware, not route handler
    app.use('*', async (c: any, next: any) => {
      c.set('isDev', true)
      if (next) {
        return await next()
      }
      return undefined
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

  // 3.1 SEO Middleware (Eat our own dog food)
  const { gravitoSeo } = await import('@gravito/luminosity-adapter-photon')
  const { seoConfig } = await import('./config/seo')

  // Mounted at root to catch /sitemap.xml and /robots.txt
  app.use('*', gravitoSeo(seoConfig))

  // 3.2 Google Analytics Injection (for SSG and Production)
  app.use('*', async (c: Context, next: Next) => {
    await next()
    const gaId = process.env.VITE_GA_ID
    if (gaId && c.res.status === 200) {
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

  // 5. Setup Vite Proxy BEFORE routes (so Vite requests are proxied first)
  if (process.env.NODE_ENV !== 'production') {
    setupViteProxy(core)
  }

  // 6. Hooks
  registerHooks(core)

  // 7. Routes (registered after Vite proxy to avoid 404 on Vite assets)
  registerRoutes(core)

  // 7. Ready (but not liftoff)
  return core
}
