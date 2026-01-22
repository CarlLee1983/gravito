/**
 * TemplateCache - LRU-based template caching with hash validation
 *
 * Features:
 * - LRU eviction with configurable max size
 * - Hash-based cache invalidation
 * - Separate cache for source and compiled templates
 * - Development mode support
 *
 * @public
 * @since 3.1.0
 */

/**
 * Compiled template representation
 */
export interface CompiledTemplate {
  /** Content hash for validation */
  hash: string
  /** Compiled render function */
  render: RenderFunction
  /** Included templates (for dependency tracking) */
  dependencies: string[]
  /** Compilation timestamp */
  compiledAt: number
}

/**
 * Render function signature
 */
export type RenderFunction = (data: Record<string, unknown>, ctx: RenderContext) => string

/**
 * Render context passed to compiled templates
 */
export interface RenderContext {
  sections: Map<string, string>
  stacks: Map<string, string[]>
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
 * Simple LRU Cache implementation using Map
 * Map preserves insertion order, so we can use it for LRU eviction
 */
class LRUMap<K, V> {
  private map = new Map<K, V>()
  private maxSize: number
  public evictions = 0

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value !== undefined) {
      this.map.delete(key)
      this.map.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) {
        this.map.delete(firstKey)
        this.evictions++
      }
    }
    this.map.set(key, value)
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
    this.evictions = 0
  }

  get size(): number {
    return this.map.size
  }
}

/**
 * Template cache with LRU eviction and hash-based invalidation
 *
 * @example
 * ```typescript
 * const cache = new TemplateCache({ maxSize: 1000 })
 *
 * // Cache source template
 * cache.setSource('home', '<h1>{{title}}</h1>')
 *
 * // Retrieve from cache
 * const source = cache.getSource('home')
 *
 * // Check statistics
 * console.log(cache.getStats())
 * // { hits: 1, misses: 0, evictions: 0, size: 1 }
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class TemplateCache {
  private sourceCache: LRUMap<string, string>
  private compiledCache: LRUMap<string, CompiledTemplate>
  private stats: { hits: number; misses: number }
  private options: Required<CacheOptions>

  constructor(options?: CacheOptions) {
    this.options = {
      maxSize: options?.maxSize ?? 500,
      enabled: options?.enabled ?? true,
      development: options?.development ?? false,
    }

    this.sourceCache = new LRUMap(this.options.maxSize)
    this.compiledCache = new LRUMap(this.options.maxSize)
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get compiled template from cache
   * Returns null if not cached or invalid (hash mismatch)
   */
  getCompiled(name: string, sourceHash: string): CompiledTemplate | null {
    if (!this.options.enabled) {
      return null
    }

    const cached = this.compiledCache.get(name)
    if (!cached) {
      this.stats.misses++
      return null
    }

    if (cached.hash !== sourceHash) {
      this.compiledCache.delete(name)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return cached
  }

  /**
   * Cache compiled template
   */
  setCompiled(
    name: string,
    source: string,
    render: RenderFunction,
    dependencies: string[] = []
  ): void {
    if (!this.options.enabled) {
      return
    }

    const hash = this.computeHash(source)

    this.compiledCache.set(name, {
      hash,
      render,
      dependencies,
      compiledAt: Date.now(),
    })
  }

  /**
   * Get source template (for include directives)
   */
  getSource(name: string): string | null {
    if (!this.options.enabled) {
      return null
    }

    const cached = this.sourceCache.get(name)
    if (cached !== undefined) {
      this.stats.hits++
      return cached
    }

    this.stats.misses++
    return null
  }

  /**
   * Cache source template
   */
  setSource(name: string, source: string): void {
    if (!this.options.enabled) {
      return
    }
    this.sourceCache.set(name, source)
  }

  /**
   * Compute hash for cache validation (DJB2 algorithm)
   */
  computeHash(source: string): string {
    let hash = 5381
    for (let i = 0; i < source.length; i++) {
      hash = ((hash << 5) + hash) ^ source.charCodeAt(i)
    }
    return (hash >>> 0).toString(36)
  }

  /**
   * Invalidate a specific template and its dependents
   */
  invalidate(name: string): void {
    this.sourceCache.delete(name)
    this.compiledCache.delete(name)
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.sourceCache.clear()
    this.compiledCache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get cache statistics
   */
  getStats(): Readonly<CacheStats> {
    return {
      ...this.stats,
      evictions: this.sourceCache.evictions + this.compiledCache.evictions,
      size: this.sourceCache.size + this.compiledCache.size,
    }
  }

  /**
   * Get cache hit rate (for monitoring)
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total === 0 ? 0 : this.stats.hits / total
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.options.enabled
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.options.development
  }
}
