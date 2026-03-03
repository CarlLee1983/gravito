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
export declare class CookieJar {
  private encrypter?
  private queued
  constructor(encrypter?: Encrypter)
  /**
   * Parse cookies from a Cookie header string using Bun's native CookieMap
   * @param header - The Cookie header value
   * @returns Parsed cookies as key-value pairs
   */
  static parseCookies(header: string): Record<string, string>
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
   * Serialize a cookie to a Set-Cookie header value using Bun's native Cookie API
   */
  private serializeCookie
  /**
   * Attach queued cookies to the context
   */
  attach(c: GravitoContext): void
}
