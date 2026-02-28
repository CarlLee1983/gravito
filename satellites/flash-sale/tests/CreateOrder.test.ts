/**
 * CreateOrder Use Case 單元測試
 *
 * 驗證薄殼 UseCase 委派 PurchaseContext 完成搶購
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { FlashSaleError, FlashSaleErrorCode } from '../src/Application/Errors/FlashSaleError'
import { CreateOrder } from '../src/Application/UseCases/CreateOrder'
import type { IOrderRepository } from '../src/Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../src/Domain/Contracts/IProductRepository'
import type { Order } from '../src/Domain/Entities/Order'
import { Product } from '../src/Domain/Entities/Product'
import { OrderStatus } from '../src/Domain/Models'
import { Money } from '../src/Domain/ValueObjects/Money'
import { Stock } from '../src/Domain/ValueObjects/Stock'

/**
 * Mock ProductRepository（Domain Contract）
 */
class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map()

  constructor() {
    // 建立測試商品
    const product = Product.create(
      'PROD-1',
      'Flash Sale Item',
      'FSI-001',
      'Limited item',
      Money.of(50),
      Money.of(25),
      Stock.of(5),
      []
    )
    this.products.set('PROD-1', product)
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
 * Mock OrderRepository（Domain Contract）
 */
class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()

  async save(entity: Order): Promise<void> {
    this.orders.set(entity.id, entity)
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values())
  }

  async delete(_id: string): Promise<void> {
    // no-op
  }

  async exists(id: string): Promise<boolean> {
    return this.orders.has(id)
  }

  async findByUserId(_userId: string): Promise<Order[]> {
    return []
  }

  async findByDateRange(): Promise<Order[]> {
    return []
  }
}

describe('CreateOrder Use Case', () => {
  let useCase: CreateOrder
  let productRepository: MockProductRepository
  let orderRepository: MockOrderRepository

  beforeEach(() => {
    productRepository = new MockProductRepository()
    orderRepository = new MockOrderRepository()
    useCase = new CreateOrder(productRepository, orderRepository)
  })

  it('should create order successfully and return OrderDTO', async () => {
    const result = await useCase.execute({
      userId: 'USER-1',
      productId: 'PROD-1',
      quantity: 2,
    })

    expect(result.id).toBeTruthy()
    expect(result.userId).toBe('USER-1')
    expect(result.status).toBe(OrderStatus.PENDING)
    expect(result.totalAmount).toBe(100) // 50 * 2
    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe('PROD-1')
  })

  it('should throw FlashSaleError for non-existent product', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'UNKNOWN',
        quantity: 1,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
    }
  })

  it('should throw FlashSaleError for insufficient stock', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'PROD-1',
        quantity: 10, // Only 5 in stock
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
    }
  })

  it('should throw FlashSaleError for zero quantity', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'PROD-1',
        quantity: 0,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
    }
  })

  it('should throw FlashSaleError for excessive quantity', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'PROD-1',
        quantity: 1001,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
    }
  })

  it('should throw FlashSaleError for empty userId', async () => {
    try {
      await useCase.execute({
        userId: '',
        productId: 'PROD-1',
        quantity: 1,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
    }
  })
})
