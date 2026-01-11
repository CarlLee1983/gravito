import {
  bodySizeLimit,
  defineConfig,
  type GravitoContext,
  type GravitoMiddleware,
  type GravitoNext,
  PlanetCore,
  securityHeaders,
} from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { serveStatic } from '@gravito/photon/bun'
import { OrbitPrism } from '@gravito/prism'
import { OrbitCache } from '@gravito/stasis'
import { registerHooks } from './hooks/index'
import { registerRoutes } from './routes/index'
import { setupViteProxy } from './utils/vite'

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

  // 2.1 Security middleware
  const isDev = process.env.NODE_ENV !== 'production'
  const devCsp = isDev ? ' http://localhost:5173 ws://localhost:5173' : ''

  const defaultCsp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${devCsp}`,
    `style-src 'self' 'unsafe-inline'${devCsp}`,
    `img-src 'self' data:${devCsp}`,
    `connect-src 'self'${devCsp}`,
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
  const staticAssets = serveStatic({ root: './' }) as unknown as GravitoMiddleware
  const favicon = serveStatic({ path: './static/favicon.ico' }) as unknown as GravitoMiddleware

  core.adapter.use('/static/*', staticAssets)
  core.adapter.route('get', '/favicon.ico', favicon)

  // 4. Vite Proxy (開發模式) - 必須在路由之前
  if (process.env.NODE_ENV !== 'production') {
    setupViteProxy(core)
    // 注入 isDev 變數供模板使用
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('isDev', true)
      await next()
      return undefined
    })
  }

  // 5. Hooks
  registerHooks(core)

  // 6. Routes
  registerRoutes(core)

  // 7. Ready (but not liftoff - for static site generation)
  return core
}
