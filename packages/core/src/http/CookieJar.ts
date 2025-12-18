import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
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

  constructor(private encrypter?: Encrypter) {}

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
   * Attach queued cookies to the context
   */
  attach(c: Context) {
    for (const [name, { value, options }] of this.queued) {
      setCookie(c, name, value, options)
    }
  }
}
