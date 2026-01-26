import { bodySizeLimit, defineConfig, PlanetCore, securityHeaders } from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { serveStatic } from '@gravito/photon/bun'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}) {
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
          maxSize: 500,
        },
      }),
      new OrbitIon(),
    ],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 2.1 Security middleware
  const isDev = process.env.NODE_ENV !== 'production'
  const devSources = isDev
    ? ' http://localhost:5173 ws://localhost:5173 http://127.0.0.1:5173 ws://127.0.0.1:5173'
    : ''

  const defaultCsp = [
    `default-src 'self'${devSources}`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'${devSources}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${devSources}`,
    `font-src 'self' https://fonts.gstatic.com${devSources}`,
    `connect-src 'self'${devSources}`,
    `img-src 'self' data:${devSources}`,
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

  // 5. Routes
  registerRoutes(core)

  // 6. Liftoff!
  return core.liftoff()
}
