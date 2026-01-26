import { defineConfig, PlanetCore, securityHeaders } from '@gravito/core'
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

  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    orbits: [OrbitCache, OrbitPrism, OrbitIon],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // Security middleware
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

  core.adapter.use(
    '*',
    securityHeaders({
      contentSecurityPolicy: csp,
    })
  )

  core.adapter.use('/static/*', serveStatic({ root: './' }) as any)
  core.adapter.route('get', '/favicon.ico', serveStatic({ path: './static/favicon.ico' }) as any)

  registerHooks(core)
  registerRoutes(core)

  return core.liftoff()
}
