import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createBeam } from '@gravito/beam'
import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { Notification, type NotificationManager, OrbitFlare } from '@gravito/flare'
import type { ProviderApp } from './provider'

const ALERT_LOG = join(process.cwd(), 'storage/alerts.log')

// Mock Notification Channel
class FileAlertChannel {
  async send(notification: any, _notifiable: any) {
    const data = JSON.stringify(notification.toJSON())
    await appendFile(ALERT_LOG, `[ALERT] ${data}\n`)
    console.log(`[Consumer] Alert written to file: ${data}`)
  }
}

// System Alert Notification
class SystemDownNotification extends Notification {
  constructor(private serviceName: string) {
    super()
  }
  via() {
    return ['file']
  }
  toJSON() {
    return {
      type: 'SYSTEM_DOWN',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
    }
  }
}

export async function startConsumer(port: number, providerPort: number) {
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

  // 1. Install Flare
  await core.orbit(new OrbitFlare({}))
  const flare = core.services.get('notifications') as NotificationManager
  flare.channel('file', new FileAlertChannel() as any)

  // 2. Beam Client
  const client = createBeam<ProviderApp>(`http://localhost:${providerPort}`)

  // 3. Health Watcher
  setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:${providerPort}/health`)
      const data = (await res.json()) as any
      if (data.status !== 'ok') {
        console.log('[Consumer] Detected Service B failure!')
        await flare.send(
          { getNotifiableId: () => 'admin' },
          new SystemDownNotification('Service-B')
        )
      }
    } catch (_e) {
      // Service B might be down (no response)
      console.log('[Consumer] Service B unreachable!')
      await flare.send(
        { getNotifiableId: () => 'admin' },
        new SystemDownNotification('Service-B-Unreachable')
      )
    }
  }, 2000)

  // 4. API to trigger RPC
  core.router.get('/trigger-rpc', async (c) => {
    const a = parseInt(c.req.query('a') || '5', 10)
    const b = parseInt(c.req.query('b') || '10', 10)

    console.log(`[Consumer] Calling Service B /calculate with ${a}, ${b}`)
    const res = await client.calculate.$get({ query: { a: String(a), b: String(b) } })
    const data = await res.json()

    return c.json({ rpc_result: data })
  })

  const liftoff = core.liftoff(port)
  Bun.serve(liftoff)

  console.log(`[Consumer] Service A ready on port ${port}`)
}
