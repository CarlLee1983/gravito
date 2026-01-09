import { DB } from '@gravito/atlas'
import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { FortifyOrbit } from '@gravito/fortify'
import { OrbitPulsar } from '@gravito/pulsar'
import { auth, CallbackUserProvider, can, OrbitSentinel } from '@gravito/sentinel'
import { User } from './models/User'

export async function startServer(port: number) {
  // Satisfy Atlas DB check
  DB.addConnection(
    {
      driver: 'sqlite',
      database: ':memory:',
    },
    'default'
  )

  // Mock connection() to return something that doesn't explode
  const mockBuilder = {
    where: () => mockBuilder,
    whereNull: () => mockBuilder,
    first: async () => null,
    get: async () => [],
    insert: async () => 1,
    update: async () => 1,
    delete: async () => 1,
    setModel: () => mockBuilder,
  }
  const mockConn = {
    query: async () => [],
    select: async () => [],
    insert: async () => 1,
    update: async () => 1,
    delete: async () => 1,
    table: () => mockBuilder,
  }
  ;(DB as any).connection = () => mockConn
  ;(DB as any).getDefaultConnection = () => 'default'
  ;(DB as any).manager = { connection: () => mockConn }

  const core = new PlanetCore({
    config: {
      APP_KEY: 'base64:7vUoKkX9W7Y2N1J+z4vQ9f1V5B3M4L5K6J7H8G9F0E1=',
    },
  })

  const defaultCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
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

  // 1. Session Support (Pulsar)
  await core.orbit(
    new OrbitPulsar({
      driver: 'memory',
      csrf: { enabled: false }, // Disable CSRF for easier CLI testing
    })
  )

  core.hooks.addAction('session:saved', async (payload: any) => {
    console.log(`[SESSION] Saved: ${payload.id}`)
  })

  core.hooks.addAction('session:miss', async (payload: any) => {
    console.log(`[SESSION] Missed: ${payload.id}`)
  })

  // 2. Auth Support (Sentinel)
  const sentinel = new OrbitSentinel({
    defaults: {
      guard: 'web',
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
        users: (_config) => new CallbackUserProvider(async (id) => await User.findBy('id', id)),
      },
    },
  })
  await core.orbit(sentinel)

  // Register a Gate for RBAC
  sentinel.gate.define('access-admin', (user) => user.role === 'admin')

  // 3. Auth Workflows (Fortify)
  await core.orbit(
    new FortifyOrbit({
      userModel: () => User as any,
      jsonMode: true, // Use JSON for API-style verification
      features: {
        registration: true,
      },
    })
  )

  // 4. Custom RBAC Middleware & Routes
  // Create admin for testing
  await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'adminpassword',
    role: 'admin',
  })

  // Use middleware for cleaner verification
  core.router.middleware(auth(), can('access-admin')).group((router) => {
    router.get('/admin', async (c) => {
      return c.json({ message: 'Welcome Admin' })
    })
  })

  core.router.middleware(auth()).group((router) => {
    router.get('/user', async (c) => {
      const authManager = c.get('auth' as any) as any
      const user = await authManager.user()
      return c.json({ message: `Welcome ${user.name}`, role: user.role })
    })
  })

  // Start Server
  const liftoff = core.liftoff(port)
  Bun.serve(liftoff)

  console.log(`[AuthServer] Ready on port ${port}`)
}
