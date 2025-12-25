import { join } from 'node:path'
import { OrbitIon } from '@gravito/ion'
import type { Photon } from '@gravito/photon'
import { serveStatic } from '@gravito/photon/bun'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import { defineConfig, GravitoAdapter, PlanetCore } from 'gravito-core'
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
    orbits: [OrbitCache, OrbitPrism, OrbitIon],
    adapter: new GravitoAdapter(),
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Static files
  const app = core.app as Photon
  const staticPath = join(import.meta.dirname, '../static/favicon.ico')
  app.get('/favicon.ico', serveStatic({ path: staticPath }))
  app.use('/static/*', serveStatic({ root: './' }))

  // 3.1 SEO Middleware (Eat our own dog food)
  const { gravitoSeo } = await import('@gravito/luminosity-adapter-photon')
  const { seoConfig } = await import('./config/seo')

  // Mounted at root to catch /sitemap.xml and /robots.txt
  app.use('*', gravitoSeo(seoConfig))

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
