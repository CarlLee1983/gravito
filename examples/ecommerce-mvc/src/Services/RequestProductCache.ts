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
 * Usage:
 * ```typescript
 * const cache = new RequestProductCache()
 * const products = await cache.getProducts([1, 2, 3])
 * ```
 */
export class RequestProductCache {
  private cache = new Map<number, CachedProduct>()
  private pendingIds = new Set<number>()
  private loadingPromise: Promise<void> | null = null

  /**
   * Get products by IDs, using cache and batch-loading uncached items
   */
  async getProducts(productIds: number[]): Promise<Map<number, CachedProduct>> {
    // Deduplicate IDs
    const uniqueIds = [...new Set(productIds)]

    // Find uncached IDs
    const uncachedIds = uniqueIds.filter((id) => !this.cache.has(id))

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
   * Clear cache (call at end of request)
   */
  clear(): void {
    this.cache.clear()
    this.pendingIds.clear()
  }
}
