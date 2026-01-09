import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { MonitorOrbit } from '@gravito/monitor'
import { Photon } from '@gravito/photon'

export function createProviderApp() {
  const app = new Photon()
    .get('/calculate', (c) => {
      const a = parseInt(c.req.query('a') || '0', 10)
      const b = parseInt(c.req.query('b') || '0', 10)
      return c.json({ result: a + b })
    })
    .get('/toggle-health', (c) => {
      const status = c.req.query('status') === 'ok'
      ;(global as any).SERVICE_HEALTHY = status
      return c.text(`Health set to ${status}`)
    })

  return app
}

export type ProviderApp = ReturnType<typeof createProviderApp>

export async function startProvider(port: number) {
  const core = new PlanetCore()

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
  // Initial health state
  ;(global as any).SERVICE_HEALTHY = true

  // 1. Install Monitor
  await core.orbit(
    new MonitorOrbit({
      health: {
        enabled: true,
        checks: [
          {
            name: 'custom-check',
            fn: async () => {
              return {
                status: (global as any).SERVICE_HEALTHY ? 'ok' : 'error',
                message: (global as any).SERVICE_HEALTHY
                  ? 'System operational'
                  : 'System simulated failure',
              }
            },
          },
        ],
      },
      metrics: { enabled: true },
    })
  )

  const app = createProviderApp()
  core.mountOrbit('/', app)

  const liftoff = core.liftoff(port)
  Bun.serve(liftoff)

  console.log(`[Provider] Service B ready on port ${port}`)
}
