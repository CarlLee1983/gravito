import { MonitorOrbit } from '@gravito/monitor'
import { Photon } from '@gravito/photon'
import { PlanetCore } from 'gravito-core'

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
