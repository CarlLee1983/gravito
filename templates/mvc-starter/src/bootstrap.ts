import { OrbitAtlas } from '@gravito/atlas'
import { defineConfig, PlanetCore } from '@gravito/core'
import { serveStatic } from '@gravito/photon/bun'
import { bodySizeLimit, securityHeaders } from '@gravito/photon/middleware/security'
import { OrbitPrism } from '@gravito/prism'
import { OrbitPulsar } from '@gravito/pulsar'
import { OrbitSentinel } from '@gravito/sentinel'
import { OrbitCache } from '@gravito/stasis'
import { registerRoutes } from './routes'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

/**
 * Bootstrap the MVC Gravito application
 *
 * 包含：認證、數據庫、緩存、會話、模板引擎
 */
export async function bootstrap(options: AppConfig = {}) {
  const { port = 3000, name = 'MVC Application', version = '1.0.0' } = options

  // 1. Configuration
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    orbits: [OrbitCache, OrbitPrism, OrbitAtlas, OrbitSentinel, OrbitPulsar],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 2.1 Security middleware
  core.use(securityHeaders())
  core.use(bodySizeLimit('10mb'))

  // 3. Static files
  core.use(serveStatic({ root: 'public', spa: false }))

  // 4. Register routes
  await registerRoutes(core)

  return { core }
}
