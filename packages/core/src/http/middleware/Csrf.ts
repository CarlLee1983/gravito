import crypto from 'node:crypto'
import type { CookieOptions } from '../CookieJar'
import type { GravitoContext, GravitoMiddleware } from '../types'

export type CsrfOptions = {
  cookieName?: string
  headerName?: string
  formFieldName?: string
  cookie?: CookieOptions
  safeMethods?: string[]
}

const defaultSafeMethods = ['GET', 'HEAD', 'OPTIONS']

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) {
    return out
  }
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) {
      continue
    }
    const key = rawKey.trim()
    const value = rest.join('=')
    out[key] = decodeURIComponent(value)
  }
  return out
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

function buildCookieOptions(custom?: CookieOptions): CookieOptions {
  return {
    path: '/',
    sameSite: 'Lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    ...custom,
  }
}

function canSetHeader(c: GravitoContext): boolean {
  return typeof (c as { header?: unknown }).header === 'function'
}

function setCookieHeader(c: GravitoContext, name: string, value: string, options: CookieOptions) {
  if (!canSetHeader(c)) {
    return
  }
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }
  if (options.path) {
    parts.push(`Path=${options.path}`)
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }
  if (options.secure) {
    parts.push('Secure')
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }
  c.header('Set-Cookie', parts.join('; '), { append: true })
}

export function getCsrfToken(c: GravitoContext, options: CsrfOptions = {}): string {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  let token = cookies[cookieName]

  if (!token) {
    token = crypto.randomBytes(32).toString('hex')
    const cookieOptions = buildCookieOptions(options.cookie)
    const cookieJar = c.get('cookieJar') as { queue: (...args: any[]) => void } | undefined
    if (cookieJar?.queue) {
      cookieJar.queue(cookieName, token, 60 * 24 * 7, cookieOptions)
    } else if (canSetHeader(c)) {
      setCookieHeader(c, cookieName, token, cookieOptions)
    }
  }

  return token
}

export function csrfProtection(options: CsrfOptions = {}): GravitoMiddleware {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const headerName = (options.headerName ?? 'X-CSRF-Token').toLowerCase()
  const formFieldName = options.formFieldName ?? '_token'
  const safeMethods = (options.safeMethods ?? defaultSafeMethods).map((m) => m.toUpperCase())

  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    const cookieHeader = c.req.header('Cookie') || ''
    const cookies = parseCookies(cookieHeader)
    const token = cookies[cookieName] || getCsrfToken(c, options)

    if (safeMethods.includes(method)) {
      await next()
      return undefined
    }

    const headerToken = c.req.header(headerName) || c.req.header(headerName.toLowerCase())
    let bodyToken: string | undefined
    const contentType = c.req.header('Content-Type') || ''
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const body = (await c.req.parseBody<Record<string, unknown>>()) || {}
      const raw = body[formFieldName]
      if (typeof raw === 'string') {
        bodyToken = raw
      }
    }

    const requestToken = headerToken || bodyToken
    if (!requestToken || !timingSafeEqual(token, requestToken)) {
      return c.text('Invalid CSRF token', 419)
    }

    await next()
    return undefined
  }
}
