import { OrbitCache } from '@gravito/stasis'
import { OrbitView } from '@gravito/orbit-view'
import { defineConfig, PlanetCore } from 'gravito-core'
import { serveStatic } from '@gravito/photon/bun'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

/**
 * Bootstrap the Gravito application
 *
 * This function handles all the boilerplate:
 * - Configuration
 * - Orbit loading (Cache, etc.)
 * - Static file serving
 * - Route registration
 * - Hook registration
 *
 * @example
 * ```ts
 * export default await bootstrap({
 *   port: 3000,
 *   name: 'My App',
 * })
 * ```
 */
export async function bootstrap(options: AppConfig = {}) {
  const { port = 3000, name = 'Gravito App', version = '1.0.0' } = options

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views', // Optional, defaults to src/views
    },
    orbits: [OrbitCache, OrbitView],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Static files
  core.app.use('/static/*', serveStatic({ root: './' }))
  core.app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }))

  // 4. Hooks
  registerHooks(core)

  // 5. Routes (MVC style)
  registerRoutes(core)

  // 6. Liftoff!
  return core.liftoff()
}
