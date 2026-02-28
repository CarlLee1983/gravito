/**
 * ListProducts UseCase (薄殼) 單元測試
 *
 * 驗證 ListProducts 委派 ProductQueryContext 並使用 ProductMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import { ListProducts } from '../../../src/Application/UseCases/ListProducts'
import type { IProductRepository } from '../../../src/Domain/Contracts/IProductRepository'
import { Product } from '../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

/**
 * Mock IProductRepository
 */
class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()

  addProduct(product: Product): void {
    this.products.set(product.id, product)
  }

  async save(entity: Product): Promise<void> {
    this.products.set(entity.id, entity)
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values())
  }

  async delete(_id: string): Promise<void> {
    // no-op
  }

  async exists(id: string): Promise<boolean> {
    return this.products.has(id)
  }

  async findBySku(_sku: string): Promise<Product | null> {
    return null
  }

  async findByIds(_ids: string[]): Promise<Product[]> {
    return []
  }

  async updateStock(_productId: string): Promise<void> {
    // no-op
  }
}

/**
 * Mock CacheService
 */
class MockCacheService implements CacheService {
  private data: Map<string, unknown> = new Map()

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null
  }

  async set(key: string, value: unknown, _ttl?: number): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  async clear(): Promise<void> {
    this.data.clear()
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const result = await callback()
    await this.set(key, result, ttl)
    return result
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key)
  }

  async increment(key: string, value?: number): Promise<number> {
    const current = (this.data.get(key) as number) || 0
    const next = current + (value || 1)
    this.data.set(key, next)
    return next
  }

  async decrement(key: string, value?: number): Promise<number> {
    return this.increment(key, -(value || 1))
  }

  async deletePattern(_pattern: string): Promise<number> {
    return 0
  }
}

describe('ListProducts UseCase (thin shell)', () => {
  let productRepo: MockProductRepository
  let cache: MockCacheService
  let useCase: ListProducts

  beforeEach(() => {
    productRepo = new MockProductRepository()
    cache = new MockCacheService()
    useCase = new ListProducts(productRepo, cache)

    // 添加測試商品
    for (let i = 0; i < 3; i++) {
      const product = Product.create(
        `PROD-${i}`,
        `Product ${i}`,
        `SKU-${i}`,
        `Description ${i}`,
        Money.of(100 + i * 10),
        Money.of(50 + i * 5),
        Stock.of(10 + i),
        []
      )
      productRepo.addProduct(product)
    }
  })

  it('should return ProductDTO list', async () => {
    const result = await useCase.execute()

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('PROD-0')
    expect(result[0].price).toBe(100)
    expect(result[0].stock.quantity).toBe(10)
  })

  it('should convert all Money values to decimal', async () => {
    const result = await useCase.execute()

    for (const dto of result) {
      expect(typeof dto.price).toBe('number')
      expect(typeof dto.cost).toBe('number')
    }

    expect(result[1].price).toBe(110)
    expect(result[2].price).toBe(120)
  })

  it('should return empty array when no products', async () => {
    const emptyRepo = new MockProductRepository()
    const emptyUseCase = new ListProducts(emptyRepo, cache)
    const result = await emptyUseCase.execute()

    expect(result).toHaveLength(0)
  })
})
