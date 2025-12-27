import { OrbitIon } from '@gravito/ion'
import { serveStatic } from '@gravito/photon/bun'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import { defineConfig, type GravitoMiddleware, PlanetCore } from 'gravito-core'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}) {
  const { port = 3000, name = 'Gravito Static Site', version = '1.0.0' } = options

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    // Add OrbitIon for static site generation
    orbits: [OrbitCache, OrbitPrism, OrbitIon],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Static files
  const staticAssets = serveStatic({ root: './' }) as unknown as GravitoMiddleware
  const favicon = serveStatic({ path: './static/favicon.ico' }) as unknown as GravitoMiddleware

  core.adapter.use('/static/*', staticAssets)
  core.adapter.route('get', '/favicon.ico', favicon)

  // 4. Hooks
  registerHooks(core)

  // 5. Routes
  registerRoutes(core)

  // 6. Ready (but not liftoff - for static site generation)
  return core
}
