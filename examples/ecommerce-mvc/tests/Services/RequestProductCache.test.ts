import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { DB } from '@gravito/atlas'
import { RequestProductCache } from '../../src/Services/RequestProductCache'

describe('RequestProductCache', () => {
  let cache: RequestProductCache
  let dbRawCallCount: number

  beforeEach(() => {
    cache = new RequestProductCache()
    dbRawCallCount = 0

    // Mock DB.raw to track call count and return only requested products
    DB.raw = mock(async (sql: any, params: any) => {
      dbRawCallCount++
      const allProducts: Record<number, any> = {
        1: { id: 1, name: 'Product 1', slug: 'product-1', image_url: 'img1.jpg', stock: 100 },
        2: { id: 2, name: 'Product 2', slug: 'product-2', image_url: 'img2.jpg', stock: 50 },
        3: { id: 3, name: 'Product 3', slug: 'product-3', image_url: 'img3.jpg', stock: 75 },
      }
      // params are the product IDs requested
      const rows = (params || []).map((id: number) => allProducts[id]).filter(Boolean)
      return { rows }
    })
  })

  describe('getProducts', () => {
    it('should load products on first call', async () => {
      const products = await cache.getProducts([1, 2, 3])
      expect(dbRawCallCount).toBe(1)
      expect(products.size).toBe(3)
      expect(products.get(1)?.name).toBe('Product 1')
    })

    it('should deduplicate product IDs in single call', async () => {
      const products = await cache.getProducts([1, 1, 2, 2, 3, 3])
      expect(dbRawCallCount).toBe(1)
      expect(products.size).toBe(3)
    })

    it('should return cached products without additional queries', async () => {
      // First call
      await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(1)

      // Second call with same IDs
      await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(1) // No additional query

      // Third call with overlapping IDs
      await cache.getProducts([2, 3])
      expect(dbRawCallCount).toBe(2) // Only loads product 3
    })

    it('should batch load only uncached products', async () => {
      // Load products 1, 2
      await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(1)

      // Load products 2, 3 - only 3 should be queried
      const products = await cache.getProducts([2, 3])
      expect(dbRawCallCount).toBe(2)
      expect(products.size).toBe(2)
      expect(products.has(2)).toBe(true)
      expect(products.has(3)).toBe(true)
    })

    it('should handle empty product list', async () => {
      const products = await cache.getProducts([])
      expect(dbRawCallCount).toBe(0)
      expect(products.size).toBe(0)
    })
  })

  describe('cache clearing', () => {
    it('should clear cache on clear() call', async () => {
      // Load some products
      await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(1)

      // Clear cache
      cache.clear()

      // Load same products again
      await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(2) // Cache was cleared, so new query
    })
  })

  describe('multi-request scenario', () => {
    it('should simulate multiple requests in a single scope', async () => {
      // Request A: load products 1, 2
      const reqA1 = await cache.getProducts([1, 2])
      expect(dbRawCallCount).toBe(1)
      expect(reqA1.size).toBe(2)

      // Request A: load products for another cart (products 2, 3)
      const reqA2 = await cache.getProducts([2, 3])
      expect(dbRawCallCount).toBe(2) // Only product 3 needed
      expect(reqA2.size).toBe(2)

      // Total: 2 queries for 3 unique products
      // Without cache: would be 3 queries
      expect(dbRawCallCount).toBe(2)
    })
  })
})
