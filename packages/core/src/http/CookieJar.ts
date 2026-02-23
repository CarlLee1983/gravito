import type { Encrypter } from '../security/Encrypter'
import type { GravitoContext } from './types'

/**
 * Options for setting cookies
 * @public
 */
export interface CookieOptions {
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number
  expires?: Date
  encrypt?: boolean
}

/**
 * Utility for managing cookies (request/response/encryption).
 * @public
 */
export class CookieJar {
  private queued: Map<string, { value: string; options: CookieOptions }> = new Map()

  constructor(private encrypter?: Encrypter) {}

  /**
   * Parse cookies from a Cookie header string using Bun's native CookieMap
   * @param header - The Cookie header value
   * @returns Parsed cookies as key-value pairs
   */
  static parseCookies(header: string): Record<string, string> {
    if (!header) return {}
    const cookieMap = new Bun.CookieMap(header)
    const out: Record<string, string> = {}
    for (const [key, value] of cookieMap.entries()) {
      out[key] = value
    }
    return out
  }

  /**
   * Queue a cookie to be sent with the response
   */
  queue(name: string, value: string, minutes = 60, options: CookieOptions = {}) {
    const resolved: CookieOptions = {
      path: options.path ?? '/',
      httpOnly: options.httpOnly ?? true,
      sameSite: options.sameSite ?? 'Lax',
      secure: options.secure ?? process.env.NODE_ENV === 'production',
      ...options,
    }
    // Convert minutes to maxAge (seconds)
    if (minutes && !resolved.maxAge) {
      resolved.maxAge = minutes * 60
    }

    let finalValue = value

    if (resolved.encrypt) {
      if (!this.encrypter) {
        throw new Error('Encryption is not available. Ensure APP_KEY is set.')
      }
      finalValue = this.encrypter.encrypt(value)
    }

    this.queued.set(name, { value: finalValue, options: resolved })
  }

  /**
   * Make a cookie that lasts "forever" (5 years)
   */
  forever(name: string, value: string, options: CookieOptions = {}) {
    this.queue(name, value, 2628000, options)
  }

  /**
   * Expire a cookie
   */
  forget(name: string, options: CookieOptions = {}) {
    this.queue(name, '', 0, { ...options, maxAge: 0, expires: new Date(0) })
  }

  /**
   * Serialize a cookie to a Set-Cookie header value using Bun's native Cookie API
   */
  private serializeCookie(name: string, value: string, opts: CookieOptions): string {
    return new Bun.Cookie(name, value, {
      path: opts.path,
      domain: opts.domain,
      expires: opts.expires,
      maxAge: opts.maxAge,
      secure: opts.secure,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite?.toLowerCase() as 'strict' | 'lax' | 'none' | undefined,
    }).toString()
  }

  /**
   * Attach queued cookies to the context
   */
  attach(c: GravitoContext) {
    for (const [name, { value, options }] of this.queued) {
      c.header('Set-Cookie', this.serializeCookie(name, value, options), { append: true })
    }
  }
}
