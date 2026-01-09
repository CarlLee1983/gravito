import { DB } from '@gravito/atlas'
import type { CacheManager } from '@gravito/stasis'

export interface ProductSnapshot {
  id: string
  sku: string
  name: string
  price: number
}

export class ProductResolver {
  constructor(private cache: CacheManager) {}

  async resolve(variantId: string, useCache: boolean): Promise<ProductSnapshot> {
    const cacheKey = `product:variant:${variantId}`

    if (useCache) {
      const cached = await this.cache.get<ProductSnapshot>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const variant = (await DB.table('product_variants')
      .where('id', variantId)
      .select('id', 'sku', 'name', 'price')
      .first()) as any

    if (!variant) {
      throw new Error(`Product variant ${variantId} not found`)
    }

    const snapshot: ProductSnapshot = {
      id: String(variant.id),
      sku: String(variant.sku),
      name: String(variant.name || 'Unnamed'),
      price: Number(variant.price),
    }

    if (useCache) {
      await this.cache.put(cacheKey, snapshot, 60)
    }

    return snapshot
  }
}
