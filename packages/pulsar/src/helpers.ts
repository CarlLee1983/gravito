import { randomBytes } from 'node:crypto'

/**
 * Encodes bytes to URL-safe base64 string.
 *
 * @param bytes - Bytes to encode
 * @returns URL-safe base64 string
 *
 * @internal
 */
export function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/**
 * Generates a cryptographically secure random token.
 *
 * @returns URL-safe base64 encoded random token
 *
 * @public
 */
export function generateToken(): string {
  return base64Url(randomBytes(32))
}

/**
 * Serializes a cookie into a Set-Cookie header value.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (path, httpOnly, secure, sameSite, maxAge)
 * @returns Formatted Set-Cookie header value
 *
 * @public
 */
export function serializeCookie(
  name: string,
  value: string,
  options: {
    path?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Lax' | 'Strict' | 'None'
    maxAge?: number
  }
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.secure) {
    parts.push('Secure')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }
  return parts.join('; ')
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 *
 * @public
 */
export function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Parses a Cookie header into a key-value object.
 *
 * @param header - Cookie header string
 * @returns Object mapping cookie names to values
 *
 * @public
 */
export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  if (!header) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) {
      continue
    }
    out[rawKey] = decodeURIComponent(rest.join('=') ?? '')
  }
  return out
}
