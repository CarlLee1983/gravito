/**
 * @fileoverview Lightweight Path Utilities
 *
 * High-performance path extraction without creating URL objects.
 * Performance critical - every optimization matters.
 *
 * @module @gravito/core/engine
 */

/**
 * Extract pathname from URL string without creating URL object
 *
 * @param url - Full URL string (e.g., "http://localhost:3000/api/users?id=1")
 * @returns pathname (e.g., "/api/users")
 *
 * @example
 * ```typescript
 * extractPath("http://localhost:3000/api/users?id=1") // "/api/users"
 * extractPath("https://example.com/") // "/"
 * ```
 */
export function extractPath(url: string): string {
  // Optimization: use indexOf which is typically faster than JS loops
  // Find "://" to skip protocol
  const protocolEnd = url.indexOf('://')

  // Start searching after "://" (add 3)
  // If no "://", start from 0 (relative implementation or malformed)
  const searchStart = protocolEnd === -1 ? 0 : protocolEnd + 3

  const pathStart = url.indexOf('/', searchStart)

  // If no slash found after protocol, it's root "/" (e.g. http://localhost)
  if (pathStart === -1) {
    return '/'
  }

  const queryStart = url.indexOf('?', pathStart)

  if (queryStart === -1) {
    return url.slice(pathStart)
  }

  return url.slice(pathStart, queryStart)
}

/**
 * Extract pathname using simpler logic (alternative implementation)
 * Use this if the above doesn't cover edge cases
 */
export function extractPathSimple(url: string): string {
  // Find "://" then find next "/"
  const protocolEnd = url.indexOf('://')
  if (protocolEnd === -1) {
    // Relative URL or malformed
    const queryStart = url.indexOf('?')
    return queryStart === -1 ? url : url.slice(0, queryStart)
  }

  const pathStart = url.indexOf('/', protocolEnd + 3)
  if (pathStart === -1) {
    return '/'
  }

  const queryStart = url.indexOf('?', pathStart)
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
}
