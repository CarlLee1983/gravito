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
export declare function extractPath(url: string): string
/**
 * Extract pathname using simpler logic (alternative implementation)
 * Use this if the above doesn't cover edge cases
 */
export declare function extractPathSimple(url: string): string
