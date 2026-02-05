import { describe, expect, it, jest } from 'bun:test'
import { deleteCookie, getCookie, setCookie } from '../src/http/cookie'

// 建立模擬的 GravitoContext
const makeContext = (
  options: {
    headers?: Record<string, string>
    cookieJar?: {
      queue: (...args: any[]) => void
      forget: (...args: any[]) => void
    } | null
  } = {}
) => {
  const responseHeaders: Record<string, string[]> = {}

  return {
    req: {
      header: (name: string) => {
        const headers = options.headers ?? {}
        const lowerName = name.toLowerCase()
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === lowerName) {
            return value
          }
        }
        return undefined
      },
    },
    get: (key: string) => {
      if (key === 'cookieJar') {
        return options.cookieJar ?? undefined
      }
      return undefined
    },
    header: (name: string, value: string, opts?: { append?: boolean }) => {
      if (opts?.append) {
        if (!responseHeaders[name]) {
          responseHeaders[name] = []
        }
        responseHeaders[name].push(value)
      } else {
        responseHeaders[name] = [value]
      }
    },
    getResponseHeaders: () => responseHeaders,
  }
}

describe('cookie utilities', () => {
  describe('getCookie', () => {
    it('should return cookie value from request', () => {
      const ctx = makeContext({
        headers: { Cookie: 'session=abc123; theme=dark' },
      }) as any

      expect(getCookie(ctx, 'session')).toBe('abc123')
    })

    it('should return specific cookie from multiple cookies', () => {
      const ctx = makeContext({
        headers: { Cookie: 'a=1; b=2; c=3' },
      }) as any

      expect(getCookie(ctx, 'b')).toBe('2')
    })

    it('should return undefined for non-existent cookie', () => {
      const ctx = makeContext({
        headers: { Cookie: 'session=abc' },
      }) as any

      expect(getCookie(ctx, 'nonexistent')).toBeUndefined()
    })

    it('should handle empty cookie header', () => {
      const ctx = makeContext({
        headers: {},
      }) as any

      expect(getCookie(ctx, 'anything')).toBeUndefined()
    })

    it('should handle missing Cookie header', () => {
      const ctx = makeContext() as any
      expect(getCookie(ctx, 'test')).toBeUndefined()
    })
  })

  describe('setCookie', () => {
    it('should use CookieJar when available', () => {
      const queueFn = jest.fn()
      const ctx = makeContext({
        cookieJar: {
          queue: queueFn,
          forget: jest.fn(),
        },
      }) as any

      setCookie(ctx, 'session', 'abc123', { maxAge: 3600 })

      expect(queueFn).toHaveBeenCalledWith('session', 'abc123', 60, expect.any(Object))
    })

    it('should convert maxAge seconds to minutes for CookieJar', () => {
      const queueFn = jest.fn()
      const ctx = makeContext({
        cookieJar: {
          queue: queueFn,
          forget: jest.fn(),
        },
      }) as any

      setCookie(ctx, 'test', 'value', { maxAge: 7200 })

      // 7200 秒 / 60 = 120 分鐘
      expect(queueFn).toHaveBeenCalledWith('test', 'value', 120, expect.any(Object))
    })

    it('should default to 60 minutes when maxAge not provided with CookieJar', () => {
      const queueFn = jest.fn()
      const ctx = makeContext({
        cookieJar: {
          queue: queueFn,
          forget: jest.fn(),
        },
      }) as any

      setCookie(ctx, 'test', 'value')

      expect(queueFn).toHaveBeenCalledWith('test', 'value', 60, expect.any(Object))
    })

    it('should fallback to Set-Cookie header when no CookieJar', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'session', 'abc123')

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie']).toBeDefined()
      expect(headers['Set-Cookie'][0]).toContain('session=abc123')
    })

    it('should include Max-Age in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { maxAge: 3600 })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('Max-Age=3600')
    })

    it('should include Expires in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any
      const expires = new Date('2025-12-31T00:00:00Z')

      setCookie(ctx, 'test', 'value', { expires })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('Expires=')
    })

    it('should include Path in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { path: '/api' })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('Path=/api')
    })

    it('should include Domain in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { domain: 'example.com' })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('Domain=example.com')
    })

    it('should include Secure flag in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { secure: true })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('Secure')
    })

    it('should include HttpOnly flag in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { httpOnly: true })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('HttpOnly')
    })

    it('should include SameSite in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'value', { sameSite: 'Strict' })

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('SameSite=Strict')
    })

    it('should URL-encode cookie value', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'test', 'hello world=foo')

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie'][0]).toContain('test=hello%20world%3Dfoo')
    })

    it('should include all options in fallback header', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      setCookie(ctx, 'full', 'value', {
        maxAge: 600,
        path: '/',
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      })

      const header = ctx.getResponseHeaders()['Set-Cookie'][0]
      expect(header).toContain('full=value')
      expect(header).toContain('Max-Age=600')
      expect(header).toContain('Path=/')
      expect(header).toContain('Domain=example.com')
      expect(header).toContain('Secure')
      expect(header).toContain('HttpOnly')
      expect(header).toContain('SameSite=Lax')
    })
  })

  describe('deleteCookie', () => {
    it('should use CookieJar.forget when available', () => {
      const forgetFn = jest.fn()
      const ctx = makeContext({
        cookieJar: {
          queue: jest.fn(),
          forget: forgetFn,
        },
      }) as any

      deleteCookie(ctx, 'session')

      expect(forgetFn).toHaveBeenCalledWith('session', {})
    })

    it('should pass options to CookieJar.forget', () => {
      const forgetFn = jest.fn()
      const ctx = makeContext({
        cookieJar: {
          queue: jest.fn(),
          forget: forgetFn,
        },
      }) as any

      deleteCookie(ctx, 'session', { path: '/', domain: 'example.com' })

      expect(forgetFn).toHaveBeenCalledWith('session', {
        path: '/',
        domain: 'example.com',
      })
    })

    it('should fallback to expired Set-Cookie when no CookieJar', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      deleteCookie(ctx, 'session')

      const headers = ctx.getResponseHeaders()
      expect(headers['Set-Cookie']).toBeDefined()
      const header = headers['Set-Cookie'][0]
      expect(header).toContain('session=')
      expect(header).toContain('Max-Age=0')
      expect(header).toContain('Expires=')
    })

    it('should pass options through in fallback mode', () => {
      const ctx = makeContext({ cookieJar: null }) as any

      deleteCookie(ctx, 'session', { path: '/', domain: 'example.com' })

      const headers = ctx.getResponseHeaders()
      const header = headers['Set-Cookie'][0]
      expect(header).toContain('Path=/')
      expect(header).toContain('Domain=example.com')
    })
  })
})
