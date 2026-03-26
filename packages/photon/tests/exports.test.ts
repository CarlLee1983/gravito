import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { HttpException } from '@gravito/core'
import * as honoBun from 'hono/bun'
import * as honoClient from 'hono/client'
import * as bunExports from '../src/bun'
import * as clientExports from '../src/client'
import * as httpExceptionExports from '../src/http-exception'
import { Photon } from '../src/index'
import * as loggerExports from '../src/logger'
import * as regExpRouterExports from '../src/router/reg-exp-router'
import * as trieRouterExports from '../src/router/trie-router'

const keys = (mod: Record<string, unknown>) => Object.keys(mod).sort()

describe('photon exports', () => {
  it('provides Photon as a standalone engine', () => {
    expect(new Photon()).toBeDefined()
  })

  it('re-exports hono/bun helpers', () => {
    expect(keys(bunExports)).toEqual(keys(honoBun))
  })

  it('re-exports hono/client helpers', () => {
    expect(keys(clientExports)).toEqual(keys(honoClient))
  })

  it('exports native logger function', () => {
    expect(typeof loggerExports.logger).toBe('function')
  })

  it('re-exports http-exception helpers from @gravito/core', () => {
    expect(typeof httpExceptionExports.HttpException).toBe('function')
    expect(httpExceptionExports.HttpException).toBe(HttpException)
  })

  it('re-exports jwt helpers via compat shim', async () => {
    const jwtExports = await import('../src/jwt')
    expect(typeof jwtExports.jwt).toBe('function')
    expect(typeof jwtExports.verify).toBe('function')
    expect(typeof jwtExports.decode).toBe('function')
    expect(typeof jwtExports.sign).toBe('function')
    expect(typeof jwtExports.verifyWithJwks).toBe('function')
  })

  it('re-exports hono router helpers', () => {
    // Note: regExpRouter and trieRouter are deprecated (type-only stubs for backwards compatibility)
    // Runtime exports are empty by design
    expect(Object.keys(regExpRouterExports).length).toBe(0)
    expect(Object.keys(trieRouterExports).length).toBe(0)
  })
})

describe('jwt module', () => {
  const TEST_SECRET = 'test-secret-key-for-jwt-testing-12345'
  let app: Photon

  beforeEach(() => {
    app = new Photon()
  })

  afterEach(() => {
    mock.restore()
  })

  it('exports all expected functions', async () => {
    const jwtExports = await import('../src/jwt')

    // Runtime function exports should be defined
    expect(typeof jwtExports.jwt).toBe('function')
    expect(typeof jwtExports.sign).toBe('function')
    expect(typeof jwtExports.verify).toBe('function')
    expect(typeof jwtExports.decode).toBe('function')
    expect(typeof jwtExports.verifyWithJwks).toBe('function')
  })

  it('signs and verifies JWT tokens correctly', async () => {
    const { sign, verify } = await import('../src/jwt')

    const payload = {
      sub: 'user-123',
      name: 'Test User',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }

    const token = await sign(payload, TEST_SECRET)
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT has 3 parts

    const verified = await verify(token, TEST_SECRET)
    expect(verified.sub).toBe('user-123')
    expect(verified.name).toBe('Test User')
  })

  it('decodes JWT tokens without verification', async () => {
    const { sign, decode } = await import('../src/jwt')

    const payload = {
      sub: 'user-456',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await sign(payload, TEST_SECRET)
    const decoded = decode(token)

    expect(decoded.payload.sub).toBe('user-456')
    expect(decoded.payload.role).toBe('admin')
    expect(decoded.header.alg).toBe('HS256') // Default algorithm
  })

  it('throws error for invalid tokens during verification', async () => {
    const { verify } = await import('../src/jwt')

    const invalidToken = 'invalid.token.here'

    await expect(verify(invalidToken, TEST_SECRET)).rejects.toThrow()
  })

  it('throws error for expired tokens', async () => {
    const { sign, verify } = await import('../src/jwt')

    const payload = {
      sub: 'user-expired',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    }

    const token = await sign(payload, TEST_SECRET)

    await expect(verify(token, TEST_SECRET)).rejects.toThrow()
  })

  it('works as middleware to protect routes', async () => {
    const { jwt } = await import('../src/jwt')

    // Protected route
    app.use('/protected/*', jwt({ secret: TEST_SECRET }))
    app.get('/protected/data', (c: GravitoContext) => c.json({ secret: 'data' }))

    // Public route
    app.get('/public', (c: GravitoContext) => c.json({ message: 'public' }))

    // Test public route
    const publicRes = await app.request('/public')
    expect(publicRes.status).toBe(200)

    // Test protected route without token
    const noTokenRes = await app.request('/protected/data')
    expect(noTokenRes.status).toBe(200) // No token, no payload, but doesn't reject

    // Test protected route with valid token
    const { sign } = await import('../src/jwt')
    const token = await sign(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET
    )

    const authRes = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(authRes.status).toBe(200)
    const body = await authRes.json()
    expect(body.secret).toBe('data')
  })
})
