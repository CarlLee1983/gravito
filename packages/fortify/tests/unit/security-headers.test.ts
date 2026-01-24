import { describe, expect, test } from 'bun:test'
import type { GravitoContext, GravitoNext } from '@gravito/core'
import { securityHeaders } from '../../src/middleware/SecurityHeaders'
import { createMockContext, createMockNext } from '../helpers/mock-context'

describe('Security Headers Middleware', () => {
  test('applies HSTS header when enabled', async () => {
    const middleware = securityHeaders({
      hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true, preload: true },
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    )
    expect((next as any).wasCalled()).toBe(true)
  })

  test('skips HSTS header when disabled', async () => {
    const middleware = securityHeaders({
      hsts: { enabled: false, maxAge: 31536000 },
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['strict-transport-security']).toBeUndefined()
  })

  test('applies CSP header when enabled', async () => {
    const middleware = securityHeaders({
      csp: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.example.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['content-security-policy']).toContain(
      "script-src 'self' https://cdn.example.com"
    )
    expect(headers['content-security-policy']).toContain("style-src 'self' 'unsafe-inline'")
  })

  test('applies X-Content-Type-Options header', async () => {
    const middleware = securityHeaders({
      noSniff: true,
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  test('applies X-Frame-Options header', async () => {
    const middleware = securityHeaders({
      frameOptions: 'DENY',
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['x-frame-options']).toBe('DENY')
  })

  test('applies X-XSS-Protection header', async () => {
    const middleware = securityHeaders({
      xssProtection: '1; mode=block',
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['x-xss-protection']).toBe('1; mode=block')
  })

  test('applies multiple headers at once', async () => {
    const middleware = securityHeaders({
      hsts: { enabled: true, maxAge: 31536000 },
      noSniff: true,
      frameOptions: 'SAMEORIGIN',
      xssProtection: '1; mode=block',
    })

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    const headers = (ctx as any)._getResponseHeaders()
    expect(headers['strict-transport-security']).toBe('max-age=31536000')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
  })

  test('handles default configuration', async () => {
    const middleware = securityHeaders({})

    const ctx = createMockContext()
    const next = createMockNext()

    await middleware(ctx as GravitoContext, next as GravitoNext)

    expect((next as any).wasCalled()).toBe(true)
  })
})
