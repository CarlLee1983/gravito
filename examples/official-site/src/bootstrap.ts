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

  const defaultCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  const cspValue = process.env.APP_CSP
  const csp = cspValue === 'false' ? false : (cspValue ?? defaultCsp)
  const hstsMaxAge = Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10)
  const bodyLimit = Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10)
  const requireLength = process.env.APP_BODY_REQUIRE_LENGTH === 'true'

  core.adapter.use(
    '*',
    securityHeaders({
      contentSecurityPolicy: csp,
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: Number.isNaN(hstsMaxAge) ? 15552000 : hstsMaxAge, includeSubDomains: true }
          : false,
    })
  )
  if (!Number.isNaN(bodyLimit) && bodyLimit > 0) {
    core.adapter.use('*', bodySizeLimit(bodyLimit, { requireContentLength: requireLength }))
  }

  // 3. Static files
  const app = core.app as any // Gravito instance
  const staticPath = join(import.meta.dirname, '../static/favicon.ico')

  // Use direct Bun.file for optimized static serving in standalone engine
  app.get('/favicon.ico', () => new Response(Bun.file(staticPath)))

  // For other static files, we can use a simple middleware for now
  app.get('/static/*', async (c: any) => {
    const path = c.req.path.replace(/^\/static\//, '')
    const file = Bun.file(join(process.cwd(), 'static', path))
    if (await file.exists()) {
      return new Response(file)
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

  // 4. Proxy Vite dev server in development mode
  if (process.env.NODE_ENV !== 'production') {
    setupViteProxy(core)
  }

  // 5. Hooks
  registerHooks(core)

  // 6. Routes
  registerRoutes(core)

  // 7. Ready (but not liftoff)
  return core
}
