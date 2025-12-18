import { describe, expect, it } from 'bun:test'
import { PlanetCore } from 'gravito-core'
import { OrbitSession } from '../src'

describe('OrbitSession', () => {
  it('persists session data via cookie', async () => {
    const now = 1_000_000
    const core = await PlanetCore.boot({
      orbits: [
        new OrbitSession({
          csrf: { enabled: false },
          now: () => now,
        }),
      ],
    })

    core.app.get('/set', (c) => {
      const session = c.get('session')
      session.put('foo', 'bar')
      return c.json({ ok: true })
    })

    core.app.get('/get', (c) => {
      const session = c.get('session')
      return c.json({ foo: session.get('foo', null) })
    })

    const res1 = await core.app.request('http://localhost/set')
    expect(res1.status).toBe(200)
    const setCookie = res1.headers.get('set-cookie')
    expect(setCookie).toContain('gravito_session=')

    const res2 = await core.app.request('http://localhost/get', {
      headers: { Cookie: setCookie! },
    })
    const body2 = (await res2.json()) as any
    expect(body2.foo).toBe('bar')
  })

  it('enforces idle timeout (server-side) with touch interval', async () => {
    let now = 1_000_000
    const core = await PlanetCore.boot({
      orbits: [
        new OrbitSession({
          csrf: { enabled: false },
          idleTimeoutSeconds: 10,
          absoluteTimeoutSeconds: 1000,
          touchIntervalSeconds: 60,
          now: () => now,
        }),
      ],
    })

    core.app.get('/set', (c) => {
      c.get('session').put('foo', 'bar')
      return c.json({ ok: true })
    })

    core.app.get('/get', (c) => {
      return c.json({ foo: c.get('session').get('foo', null) })
    })

    const res1 = await core.app.request('http://localhost/set')
    const cookie = res1.headers.get('set-cookie')!

    now += 11_000
    const res2 = await core.app.request('http://localhost/get', { headers: { Cookie: cookie } })
    const body2 = (await res2.json()) as any
    expect(body2.foo).toBe(null)
  })

  it('rejects unsafe requests without CSRF header', async () => {
    const now = 1_000_000
    const core = await PlanetCore.boot({
      orbits: [
        new OrbitSession({
          now: () => now,
        }),
      ],
    })

    core.app.get('/csrf', (c) => c.json({ token: c.get('csrf').token() }))
    core.app.post('/submit', (c) => c.json({ ok: true }))

    const res1 = await core.app.request('http://localhost/csrf')
    const cookie = res1.headers.get('set-cookie')!
    const token = ((await res1.json()) as any).token

    const res2 = await core.app.request('http://localhost/submit', {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(res2.status).toBe(403)

    const res3 = await core.app.request('http://localhost/submit', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': token },
    })
    expect(res3.status).toBe(200)
  })
})
