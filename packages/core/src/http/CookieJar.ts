import type { GravitoContext } from './types'
import type { Encrypter } from '../security/Encrypter'

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

export class CookieJar {
  private queued: Map<string, { value: string; options: CookieOptions }> = new Map()

  constructor(private encrypter?: Encrypter) { }

  /**
   * Queue a cookie to be sent with the response
   */
  queue(name: string, value: string, minutes = 60, options: CookieOptions = {}) {
    // Convert minutes to maxAge (seconds)
    if (minutes && !options.maxAge) {
      options.maxAge = minutes * 60
    }

    let finalValue = value

    if (options.encrypt) {
      if (!this.encrypter) {
        throw new Error('Encryption is not available. Ensure APP_KEY is set.')
      }
      finalValue = this.encrypter.encrypt(value)
    }

    this.queued.set(name, { value: finalValue, options })
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
   * Serialize a cookie to a Set-Cookie header value
   */
  private serializeCookie(name: string, value: string, opts: CookieOptions): string {
    const parts = [`${name}=${encodeURIComponent(value)}`]
    if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`)
    if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`)
    if (opts.path) parts.push(`Path=${opts.path}`)
    if (opts.domain) parts.push(`Domain=${opts.domain}`)
    if (opts.secure) parts.push('Secure')
    if (opts.httpOnly) parts.push('HttpOnly')
    if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
    return parts.join('; ')
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
