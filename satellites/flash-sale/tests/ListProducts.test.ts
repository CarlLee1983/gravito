/**
 * ListProducts Use Case 單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { ListProducts } from '../src/Application/UseCases/ListProducts'
import type { IProductRepository } from '../src/Application/Contracts/IProductRepository'
import type { Product } from '../src/Domain/Models'
import { ProductStatus } from '../src/Domain/Models'

/**
 * Mock ProductRepository
 */
class MockProductRepository implements IProductRepository {
  private products: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      sku: 'SKU-001',
      description: 'Test product 1',
      price: 100,
      cost: 50,
      stock: 10,
      status: ProductStatus.ACTIVE,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Product 2',
      sku: 'SKU-002',
      description: 'Test product 2',
      price: 200,
      cost: 100,
      stock: 0,
      status: ProductStatus.ACTIVE,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) || null
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.find((p) => p.sku === sku) || null
  }

  async findAll(
    filters?: { status?: string; page?: number; limit?: number }
  ): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1
    const limit = filters?.limit || 20

    const start = (page - 1) * limit
    const items = this.products.slice(start, start + limit)

    return {
      items,
      total: this.products.length,
      page,
      limit,
    }
  }

  async create(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async update(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async updateStock(): Promise<void> {
    throw new Error('Not implemented')
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findByIds(): Promise<Product[]> {
    throw new Error('Not implemented')
  }
}

describe('ListProducts Use Case', () => {
  let useCase: ListProducts
  let repository: MockProductRepository

  beforeEach(() => {
    repository = new MockProductRepository()
    useCase = new ListProducts(repository)
  })

  it('should return all products with default pagination', async () => {
    const result = await useCase.execute({})

    expect(result.items.length).toBe(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.hasMore).toBe(false)
  })

  it('should return products with custom page and limit', async () => {
    const result = await useCase.execute({
      page: 1,
      limit: 1,
    })

    expect(result.items.length).toBe(1)
    expect(result.total).toBe(2)
    expect(result.hasMore).toBe(true)
  })

  it('should validate page number (minimum 1)', async () => {
    const result = await useCase.execute({
      page: 0,
      limit: 20,
    })

    expect(result.page).toBe(1)
  })

  it('should limit max limit to 100', async () => {
    const result = await useCase.execute({
      page: 1,
      limit: 200,
    })

    expect(result.limit).toBe(100)
  })
})
