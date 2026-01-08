import { DB, OrbitAtlas } from '@gravito/atlas'
import {
  app,
  bodySizeLimit,
  defineConfig,
  type GravitoContext,
  type GravitoMiddleware,
  type GravitoNext,
  PlanetCore,
  securityHeaders,
} from '@gravito/core'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitPulsar } from '@gravito/pulsar'
import { OrbitSentinel } from '@gravito/sentinel'
import { OrbitCache } from '@gravito/stasis'
import { initializeDatabase } from './database/init'
import { handleInertiaRequests } from './middleware/HandleInertiaRequests'
import { User } from './models/User'
import { registerRoutes } from './routes/index'
import { setupViteProxy } from './utils/vite'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}) {
  const { port = 3001, name = 'Gravito Blog MVC', version = '1.0.0' } = options

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      APP_KEY: 'bWVnYS1zZWNyZXQta2V5LXNob3VsZC1iZS0zMi1ieXRlcw==', // Dummy base64 key
      VIEW_DIR: 'src/views',
      database: {
        default: 'default',
        connections: {
          default: {
            driver: 'sqlite',
            database: './blog.sqlite',
          },
        },
      },
    },
    orbits: [
      new OrbitCache(),
      new OrbitAtlas(),
      new OrbitPrism(),
      new OrbitIon(),
      new OrbitPulsar({
        driver: 'memory',
        csrf: {
          enabled: false, // Disable for dev to avoid session mismatch on restart
        },
      }),
      new OrbitSentinel({
        defaults: {
          guard: 'web',
          passwords: 'users',
        },
        guards: {
          web: {
            driver: 'session',
            provider: 'users',
          },
        },
        providers: {
          users: {
            driver: 'callback',
          },
        },
        bindings: {
          providers: {
            users: (config: Record<string, any>) => ({
              async retrieveById(id: string | number) {
                return await User.find(id)
              },
              async retrieveByCredentials(credentials: Record<string, any>) {
                if (!credentials.email) return null
                return await User.query().where('email', credentials.email).first()
              },
              async validateCredentials(user: any, credentials: Record<string, any>) {
                // We wrap this in a way that we can get core via app()
                const core = app()
                return await core.hasher.check(
                  credentials.password as string,
                  (user as any).password
                )
              },
            }),
          },
        },
      }),
    ],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  await initializeDatabase(core)
  core.registerGlobalErrorHandlers()

  // 2.1 Security & Middleware
  const isDev = process.env.NODE_ENV !== 'production'
  const devOrigin = 'http://localhost:5174'
  const devCsp = isDev ? ` ${devOrigin} ws://localhost:5174` : ''

  core.adapter.use(
    '*',
    securityHeaders({
      contentSecurityPolicy: [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval'${devCsp}`,
        `style-src 'self' 'unsafe-inline'${devCsp} https://fonts.googleapis.com`,
        `img-src 'self' data: https:${devCsp}`,
        `connect-src 'self'${devCsp}`,
        `font-src 'self' https://fonts.gstatic.com`,
        "object-src 'none'",
      ].join('; '),
    })
  )

  core.adapter.use('*', bodySizeLimit(1024 * 1024)) // 1MB limit

  // 3. Vite Proxy (Development)
  if (isDev) {
    setupViteProxy(core)
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('isDev', true)
      return (await next()) as any
    })
  }

  // 4. Global Middleware
  core.adapter.use('*', handleInertiaRequests)

  // 5. Initialize Database
  await initializeDatabase(core)

  // 6. Routes
  await registerRoutes(core)

  return core
}
