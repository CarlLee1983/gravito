/**
 * Cache type definitions
 *
 * @public
 * @since 3.1.0
 */

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Maximum number of entries (default: 500) */
  maxSize?: number
  /** Enable/disable caching (default: true) */
  enabled?: boolean
  /** Development mode - validates cache on every access (default: false) */
  development?: boolean
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

/**
 * Compiled template representation
 */
export interface CompiledTemplate {
  /** Content hash for validation */
  hash: string
  /** Included templates (for dependency tracking) */
  dependencies: string[]
  /** Compilation timestamp */
  compiledAt: number
}
