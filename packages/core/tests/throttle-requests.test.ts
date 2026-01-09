import { describe, expect, it } from 'bun:test'
import { ThrottleRequests } from '../src/http/middleware/ThrottleRequests'
import { PlanetCore } from '../src/PlanetCore'

class TestLogger {
  public warns: string[] = []
  debug() {}
  info() {}
  warn(message: string) {
    this.warns.push(message)
  }
  error() {}
}

describe('ThrottleRequests', () => {
  it('skips rate limiting when cache is missing', async () => {
    const logger = new TestLogger()
    const core = new PlanetCore({ logger })
    const throttle = new ThrottleRequests(core)
    const middleware = throttle.handle()

    let nextCalled = false
    const ctx = {
      get: (_key: string) => undefined,
      req: { header: (_name: string) => undefined, path: '/test' },
    }

    await middleware(ctx as any, async () => {
      nextCalled = true
      return undefined
    })

    expect(nextCalled).toBe(true)
    expect(logger.warns.length).toBe(1)
  })

  it('returns 429 when limit is exceeded', async () => {
    const core = new PlanetCore()
    const throttle = new ThrottleRequests(core)
    const middleware = throttle.handle(2, 60)

    const headers = new Map<string, string>()
    const ctx = {
      get: (key: string) => {
        if (key === 'cache') {
          return {
            limiter: () => ({
              attempt: async () => ({ allowed: false, remaining: 0, reset: 123 }),
            }),
          }
        }
        return undefined
      },
      header: (name: string, value: string) => {
        headers.set(name, value)
      },
      req: { header: (_name: string) => '203.0.113.1', path: '/test' },
      text: (text: string, status: number) => new Response(text, { status }),
    }

    const res = await middleware(ctx as any, async () => undefined)
    expect(res?.status).toBe(429)
    expect(headers.get('X-RateLimit-Limit')).toBe('2')
    expect(headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(headers.get('X-RateLimit-Reset')).toBe('123')
    expect(headers.get('Retry-After')).toBe('60')
  })

  it('allows request when limiter permits it', async () => {
    const core = new PlanetCore()
    const throttle = new ThrottleRequests(core)
    const middleware = throttle.handle(5, 10)

    const headers = new Map<string, string>()
    let nextCalled = false
    const ctx = {
      get: (key: string) => {
        if (key === 'cache') {
          return {
            limiter: () => ({
              attempt: async () => ({ allowed: true, remaining: 4, reset: 0 }),
            }),
          }
        }
        return undefined
      },
      header: (name: string, value: string) => {
        headers.set(name, value)
      },
      req: { header: (_name: string) => '203.0.113.1', path: '/test' },
    }

    const res = await middleware(ctx as any, async () => {
      nextCalled = true
      return undefined
    })

    expect(res).toBeUndefined()
    expect(nextCalled).toBe(true)
    expect(headers.get('X-RateLimit-Limit')).toBe('5')
    expect(headers.get('X-RateLimit-Remaining')).toBe('4')
    expect(headers.has('Retry-After')).toBe(false)
  })
})
