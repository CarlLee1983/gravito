import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

describe('Security Mitigation (CVE-2025-29927)', () => {
  it('should return 401 when fast-path handler manually enforces auth', async () => {
    const adapter = new BunNativeAdapter()

    // Simulate a protected fast-path route
    // Note: Global middleware is bypassed for fast-paths, so protection MUST be manual
    adapter.registerFastPath('GET', '/api/secure-fast', (req) => {
      const auth = req.headers.get('Authorization')
      if (auth !== 'Bearer valid-token') {
        return new Response('Unauthorized', { status: 401 })
      }
      return new Response('Success')
    })

    // 1. Request without credentials -> 401
    const req1 = new Request('http://localhost/api/secure-fast')
    const res1 = await adapter.fetch(req1)
    expect(res1.status).toBe(401)
    expect(await res1.text()).toBe('Unauthorized')

    // 2. Request with valid credentials -> 200
    const req2 = new Request('http://localhost/api/secure-fast', {
      headers: { 'Authorization': 'Bearer valid-token' }
    })
    const res2 = await adapter.fetch(req2)
    expect(res2.status).toBe(200)
    expect(await res2.text()).toBe('Success')
  })

  it('should demonstrate that global middleware is bypassed for fast-paths', async () => {
    const adapter = new BunNativeAdapter()
    let middlewareCalled = false

    // Register global middleware that SHOULD be bypassed
    adapter.useGlobal(async (c, next) => {
      middlewareCalled = true
      return next()
    })

    // Register a fast-path
    adapter.registerFastPath('GET', '/fast', () => {
      return new Response('fast')
    })

    // Register a normal path
    adapter.route('get', '/normal', (c: any) => c.text('normal'))

    // Test fast path
    const res1 = await adapter.fetch(new Request('http://localhost/fast'))
    expect(await res1.text()).toBe('fast')
    expect(middlewareCalled).toBe(false) // SHOULD BE FALSE

    // Test normal path
    const res2 = await adapter.fetch(new Request('http://localhost/normal'))
    expect(await res2.text()).toBe('normal')
    expect(middlewareCalled).toBe(true)
  })
})
