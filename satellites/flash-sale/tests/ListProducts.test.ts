/**
 * ListProducts Use Case 單元測試
 *
 * 驗證薄殼 UseCase 委派 ProductQueryContext 並返回 ProductDTO 陣列
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CacheService } from '@gravito/core'
import { ListProducts } from '../src/Application/UseCases/ListProducts'
import type { IProductRepository } from '../src/Domain/Contracts/IProductRepository'
import { Product } from '../src/Domain/Entities/Product'
import { ProductStatus } from '../src/Domain/Models'
import { Money } from '../src/Domain/ValueObjects/Money'
import { Stock } from '../src/Domain/ValueObjects/Stock'

/**
 * Mock ProductRepository（Domain Contract）
 */
class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()

  constructor() {
    const product1 = Product.create(
      '1',
      'Product 1',
      'SKU-001',
      'Test product 1',
      Money.of(100),
      Money.of(50),
      Stock.of(10),
      []
    )
    const product2 = Product.create(
      '2',
      'Product 2',
      'SKU-002',
      'Test product 2',
      Money.of(200),
      Money.of(100),
      Stock.of(0),
      []
    )
    this.products.set('1', product1)
    this.products.set('2', product2)
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

  async updateStock(): Promise<void> {
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

describe('ListProducts Use Case', () => {
  let useCase: ListProducts
  let repository: MockProductRepository
  let cache: MockCacheService

  beforeEach(() => {
    repository = new MockProductRepository()
    cache = new MockCacheService()
    useCase = new ListProducts(repository, cache)
  })

  it('should return all products as ProductDTO array', async () => {
    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBeTruthy()
    expect(typeof result[0].price).toBe('number')
    expect(typeof result[0].cost).toBe('number')
  })

  it('should convert Money values to decimal', async () => {
    const result = await useCase.execute()

    const prod1 = result.find((p) => p.id === '1')
    expect(prod1!.price).toBe(100)
    expect(prod1!.cost).toBe(50)
  })

  it('should include stock information', async () => {
    const result = await useCase.execute()

    const prod1 = result.find((p) => p.id === '1')
    expect(prod1!.stock.quantity).toBe(10)
    expect(prod1!.stock.isAvailable).toBe(true)

    const prod2 = result.find((p) => p.id === '2')
    expect(prod2!.stock.quantity).toBe(0)
    expect(prod2!.stock.isAvailable).toBe(false)
  })

  it('should return empty array when no products exist', async () => {
    const emptyRepo: IProductRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findBySku: async () => null,
      findByIds: async () => [],
      updateStock: async () => {},
    }

    const emptyUseCase = new ListProducts(emptyRepo, cache)
    const result = await emptyUseCase.execute()

    expect(result).toHaveLength(0)
  })
})
