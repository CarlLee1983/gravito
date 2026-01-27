import { CookieJar, type CookieOptions } from './CookieJar'
import type { GravitoContext } from './types'

/**
 * Get a cookie value from the request
 * @param c - Context object
 * @param name - Cookie name
 * @returns Cookie value or undefined
 * @public
 */
export function getCookie(c: GravitoContext, name: string): string | undefined {
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = CookieJar.parseCookies(cookieHeader)
  return cookies[name]
}

/**
 * Set a cookie in the response
 * @param c - Context object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @public
 */
export function setCookie(
  c: GravitoContext,
  name: string,
  value: string,
  options: CookieOptions & { maxAge?: number } = {}
): void {
  // Try to use CookieJar if available (when using PlanetCore)
  const cookieJar = c.get('cookieJar') as CookieJar | undefined
  if (cookieJar) {
    // Convert maxAge (seconds) to minutes for CookieJar
    const minutes = options.maxAge ? Math.floor(options.maxAge / 60) : 60
    cookieJar.queue(name, value, minutes, options)
    return
  }

  // Fallback: Set cookie header directly
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

/**
 * Delete a cookie (expire it)
 * @param c - Context object
 * @param name - Cookie name
 * @param options - Cookie options (path, domain, etc.)
 * @public
 */
export function deleteCookie(c: GravitoContext, name: string, options: CookieOptions = {}): void {
  // Try to use CookieJar if available
  const cookieJar = c.get('cookieJar') as CookieJar | undefined
  if (cookieJar) {
    cookieJar.forget(name, options)
    return
  }

  // Fallback: Set cookie with expired date
  setCookie(c, name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  })
}
