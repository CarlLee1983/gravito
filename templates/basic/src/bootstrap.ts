import { defineConfig, PlanetCore } from '@gravito/core'
import { serveStatic } from '@gravito/photon/bun'
import { bodySizeLimit, securityHeaders } from '@gravito/photon/middleware/security'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
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
    orbits: [OrbitCache, OrbitPrism],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 2.1 Security middleware
  const defaultCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
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
  // serveStatic root: './' maps URL /static/foo.png to ./static/foo.png on disk.
  core.adapter.use('/static/*', serveStatic({ root: './' }) as any)
  core.adapter.route('get', '/favicon.ico', serveStatic({ path: './static/favicon.ico' }) as any)

  // 4. Hooks
  registerHooks(core)

  // 5. Routes (MVC style)
  registerRoutes(core)

  // 6. Liftoff!
  return core.liftoff()
}
