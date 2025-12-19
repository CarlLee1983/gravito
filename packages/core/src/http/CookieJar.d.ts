import type { Context } from 'hono'
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
export declare class CookieJar {
  private encrypter?
  private queued
  constructor(encrypter?: Encrypter | undefined)
  /**
   * Queue a cookie to be sent with the response
   */
  queue(name: string, value: string, minutes?: number, options?: CookieOptions): void
  /**
   * Make a cookie that lasts "forever" (5 years)
   */
  forever(name: string, value: string, options?: CookieOptions): void
  /**
   * Expire a cookie
   */
  forget(name: string, options?: CookieOptions): void
  /**
   * Attach queued cookies to the context
   */
  attach(c: Context): void
}
//# sourceMappingURL=CookieJar.d.ts.map
