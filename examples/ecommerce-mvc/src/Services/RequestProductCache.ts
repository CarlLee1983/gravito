import { DB } from '@gravito/atlas'
import { sql } from '../utils/db'

/**
 * Product cache entry
 */
export interface CachedProduct {
  id: number
  name: string
  slug: string
  image_url: string | null
  stock: number
}

/**
 * Request-level Product Cache
 *
 * Caches products within a single HTTP request to avoid duplicate queries.
 * Automatically deduplicates product IDs and batches database lookups.
 *
 * Integrates with @gravito/core RequestScope for automatic lifecycle management.
 *
 * Usage in Controller:
 * ```typescript
 * const cache = ctx.scoped('product:cache', () => new RequestProductCache())
 * const products = await cache.getProducts([1, 2, 3])
 * // Automatically cleaned up when request ends
 * ```
 */
export class RequestProductCache {
  private cache = new Map<number, CachedProduct>()
  private pendingIds = new Set<number>()
  private loadingPromise: Promise<void> | null = null
  private queryCount = 0
  private hitCount = 0

  /**
   * Get products by IDs, using cache and batch-loading uncached items
   *
   * Tracks cache hits and misses for diagnostics
   */
  async getProducts(productIds: number[]): Promise<Map<number, CachedProduct>> {
    // Deduplicate IDs
    const uniqueIds = [...new Set(productIds)]

    // Find uncached IDs
    const uncachedIds = uniqueIds.filter((id) => !this.cache.has(id))

    // Track cache statistics
    this.hitCount += uniqueIds.length - uncachedIds.length
    if (uncachedIds.length > 0) {
      this.queryCount++
    }

    // Load uncached products
    if (uncachedIds.length > 0) {
      // If another request is already loading, wait for it
      if (this.loadingPromise) {
        await this.loadingPromise
      } else {
        this.loadingPromise = this.loadProducts(uncachedIds)
        await this.loadingPromise
        this.loadingPromise = null
      }
    }

    // Return result map
    const result = new Map<number, CachedProduct>()
    for (const id of uniqueIds) {
      const product = this.cache.get(id)
      if (product) {
        result.set(id, product)
      }
    }

    return result
  }

  /**
   * Batch-load products from database
   */
  private async loadProducts(productIds: number[]): Promise<void> {
    if (productIds.length === 0) return

    const result = await DB.raw(
      sql(
        `SELECT id, name, slug, image_url, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`
      ),
      productIds
    )

    for (const row of result.rows) {
      const product = row as any
      this.cache.set(product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        stock: product.stock,
      })
    }
  }

  /**
   * Get cache statistics
   *
   * Returns metrics about cache performance during this request
   */
  getStats() {
    return {
      cachedProducts: this.cache.size,
      totalQueries: this.queryCount,
      cacheHits: this.hitCount,
      hitRate:
        this.hitCount > 0
          ? (this.hitCount / (this.hitCount + this.queryCount * 10)).toFixed(2)
          : '0',
    }
  }

  /**
   * Cleanup hook called automatically by RequestScope
   *
   * Called when the HTTP request ends, logs statistics and releases resources.
   * This is automatically called by the Gravito engine when using RequestScope.
   */
  async cleanup(): Promise<void> {
    const stats = this.getStats()
    console.log(
      `[ProductCache] Request stats: ` +
        `products=${stats.cachedProducts}, ` +
        `queries=${stats.totalQueries}, ` +
        `hits=${stats.cacheHits}, ` +
        `hitRate=${stats.hitRate}`
    )
    this.cache.clear()
    this.pendingIds.clear()
  }
}
