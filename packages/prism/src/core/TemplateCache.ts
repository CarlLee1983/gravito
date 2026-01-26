/**
 * TemplateCache - LRU-based template caching mechanism.
 *
 * Implements a Least Recently Used (LRU) cache with optional hash-based invalidation.
 *
 * Features:
 * - **Memory Management**: Limits cache size to prevent OOM errors.
 * - **Performance**: Reduces file I/O and recompilation overhead.
 * - **Integrity**: Supports content hashing to ensure stale templates are not served.
 * - **Developer Experience**: Hot-reloading friendly in development mode.
 *
 * @public
 * @since 3.1.0
 */

/**
 * Represents a successfully compiled template in cache.
 */
export interface CompiledTemplate {
  /** Content hash for integrity validation. */
  hash: string
  /** The executable render function derived from the template. */
  render: RenderFunction
  /** List of other templates (partials/components) this template depends on. */
  dependencies: string[]
  /** Timestamp of when the template was compiled. */
  compiledAt: number
}

/**
 * Function signature for a compiled template renderer.
 *
 * @param data - Variable context.
 * @param ctx - Rendering context (sections/stacks).
 * @returns Rendered string.
 */
export type RenderFunction = (data: Record<string, unknown>, ctx: RenderContext) => string

/**
 * Context passed to compiled templates during execution.
 */
export interface RenderContext {
  sections: Map<string, string>
  stacks: Map<string, string[]>
}

/**
 * Runtime statistics for the cache system.
 */
export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

/**
 * Configuration options for the TemplateCache.
 */
export interface CacheOptions {
  /** Maximum number of items to hold in cache. @default 500 */
  maxSize?: number
  /** Whether to enable caching. @default true */
  enabled?: boolean
  /** If true, verifies file hashes on every read (slower, but safer for dev). @default false */
  development?: boolean
}

/**
 * Simple LRU Cache implementation using Map.
 *
 * Exploits JavaScript's Map property where iteration order follows insertion order.
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
 * Template cache with LRU eviction and hash-based invalidation.
 *
 * Manages two separate caches:
 * 1. Source Cache: Raw template strings (reduces disk I/O).
 * 2. Compiled Cache: Processed render functions (reduces CPU).
 *
 * @example
 * ```typescript
 * const cache = new TemplateCache({ maxSize: 1000 });
 *
 * // Cache source template
 * cache.setSource('home', '<h1>{{title}}</h1>');
 *
 * // Retrieve from cache
 * const source = cache.getSource('home');
 *
 * // Check statistics
 * console.log(cache.getStats());
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

  /**
   * Create a new TemplateCache instance.
   *
   * @param options - Cache configuration.
   */
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
   * Retrieve a compiled template from the cache.
   *
   * @param name - Template name or key.
   * @param sourceHash - Current hash of the source content to validate freshness.
   * @returns The compiled template if found and valid, otherwise null.
   *
   * @example
   * ```typescript
   * const compiled = cache.getCompiled('home', 'hash123');
   * if (compiled) {
   *   // Use compiled.render(...)
   * }
   * ```
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
   * Store a compiled template in the cache.
   *
   * @param name - Template name or key.
   * @param source - Raw template source (used to compute validation hash).
   * @param render - The executable render function.
   * @param dependencies - List of dependencies (included files).
   *
   * @example
   * ```typescript
   * cache.setCompiled('home', '<h1>...</h1>', renderFn, ['layout']);
   * ```
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
   * Retrieve raw source template from cache.
   *
   * @param name - Template name.
   * @returns Raw template string or null if not found.
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
   * Store raw source template in cache.
   *
   * @param name - Template name.
   * @param source - Raw template string.
   */
  setSource(name: string, source: string): void {
    if (!this.options.enabled) {
      return
    }
    this.sourceCache.set(name, source)
  }

  /**
   * Compute a lightweight hash for cache validation.
   *
   * Uses the DJB2 algorithm for speed.
   *
   * @param source - String content to hash.
   * @returns Base36 encoded hash string.
   */
  computeHash(source: string): string {
    let hash = 5381
    for (let i = 0; i < source.length; i++) {
      hash = ((hash << 5) + hash) ^ source.charCodeAt(i)
    }
    return (hash >>> 0).toString(36)
  }

  /**
   * Invalidate a specific template and remove it from all caches.
   *
   * @param name - Template name to remove.
   */
  invalidate(name: string): void {
    this.sourceCache.delete(name)
    this.compiledCache.delete(name)
  }

  /**
   * Clear all items from all caches.
   *
   * Resets hits/misses counters but keeps total eviction count.
   */
  clear(): void {
    this.sourceCache.clear()
    this.compiledCache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get current cache performance statistics.
   *
   * @returns Read-only statistics object.
   */
  getStats(): Readonly<CacheStats> {
    return {
      ...this.stats,
      evictions: this.sourceCache.evictions + this.compiledCache.evictions,
      size: this.sourceCache.size + this.compiledCache.size,
    }
  }

  /**
   * Calculate current cache hit rate.
   *
   * @returns Number between 0 and 1.
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total === 0 ? 0 : this.stats.hits / total
  }

  /**
   * Check if caching is currently enabled.
   */
  isEnabled(): boolean {
    return this.options.enabled
  }

  /**
   * Check if running in development mode.
   */
  isDevelopment(): boolean {
    return this.options.development
  }
}
