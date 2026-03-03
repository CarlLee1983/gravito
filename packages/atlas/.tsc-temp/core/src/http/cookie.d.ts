import { type CookieOptions } from './CookieJar'
import type { GravitoContext } from './types'
/**
 * Get a cookie value from the request
 * @param c - Context object
 * @param name - Cookie name
 * @returns Cookie value or undefined
 * @public
 */
export declare function getCookie(c: GravitoContext, name: string): string | undefined
/**
 * Set a cookie in the response
 * @param c - Context object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @public
 */
export declare function setCookie(
  c: GravitoContext,
  name: string,
  value: string,
  options?: CookieOptions & {
    maxAge?: number
  }
): void
/**
 * Delete a cookie (expire it)
 * @param c - Context object
 * @param name - Cookie name
 * @param options - Cookie options (path, domain, etc.)
 * @public
 */
export declare function deleteCookie(c: GravitoContext, name: string, options?: CookieOptions): void
