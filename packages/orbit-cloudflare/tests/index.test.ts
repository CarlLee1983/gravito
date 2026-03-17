import { describe, expect, it } from 'bun:test'

import { handle, OrbitCloudflare } from '../src/index'

describe('OrbitCloudflare', () => {
  it('binds env entries onto the request context', async () => {
    let middleware: ((ctx: any, next: () => Promise<Response>) => Promise<Response>) | undefined

    await OrbitCloudflare.boot({
      adapter: {
        useGlobal(fn: typeof middleware) {
          middleware = fn
        },
      },
    })

    expect(middleware).toBeDefined()

    const store = new Map<string, unknown>()
    const response = await middleware!(
      {
        env: { KV: { name: 'demo' }, FEATURE_FLAG: true },
        set(key: string, value: unknown) {
          store.set(key, value)
        },
      },
      async () => new Response('ok')
    )

    expect(response.status).toBe(200)
    expect(store.get('KV')).toEqual({ name: 'demo' })
    expect(store.get('FEATURE_FLAG')).toBe(true)
  })

  it('delegates fetch handling to the Gravito app', async () => {
    const app = {
      fetch(request: Request) {
        return new Response(`handled ${new URL(request.url).pathname}`)
      },
    }

    const worker = handle(app as any)
    const response = await worker.fetch(
      new Request('https://example.com/demo'),
      {},
      {} as ExecutionContext
    )

    expect(await response.text()).toBe('handled /demo')
  })
})
