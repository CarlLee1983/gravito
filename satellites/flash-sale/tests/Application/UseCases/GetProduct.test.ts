/**
 * GetProduct UseCase (薄殼) 單元測試
 *
 * 驗證 GetProduct 委派 ProductQueryContext 並使用 ProductMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import { GetProduct } from '../../../src/Application/UseCases/GetProduct'
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

describe('GetProduct UseCase (thin shell)', () => {
  let productRepo: MockProductRepository
  let cache: MockCacheService
  let useCase: GetProduct

  beforeEach(() => {
    productRepo = new MockProductRepository()
    cache = new MockCacheService()
    useCase = new GetProduct(productRepo, cache)

    const product = Product.create(
      'PROD-1',
      'Flash Sale Item',
      'SKU-001',
      'A great product',
      Money.of(99.99),
      Money.of(50),
      Stock.of(100),
      ['https://example.com/img.jpg']
    )
    productRepo.addProduct(product)
  })

  it('should return ProductDTO for existing product', async () => {
    const result = await useCase.execute('PROD-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('PROD-1')
    expect(result!.name).toBe('Flash Sale Item')
    expect(result!.price).toBe(99.99)
    expect(result!.cost).toBe(50)
    expect(result!.stock.quantity).toBe(100)
    expect(result!.stock.isAvailable).toBe(true)
    expect(result!.status).toBe(ProductStatus.ACTIVE)
  })

  it('should return null for non-existent product', async () => {
    const result = await useCase.execute('NONEXISTENT')
    expect(result).toBeNull()
  })

  it('should convert Money values to decimal', async () => {
    const result = await useCase.execute('PROD-1')
    expect(typeof result!.price).toBe('number')
    expect(typeof result!.cost).toBe('number')
    expect(result!.price).toBe(99.99)
  })
})
