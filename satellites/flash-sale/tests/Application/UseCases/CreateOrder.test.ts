/**
 * CreateOrder UseCase (薄殼) 單元測試
 *
 * 驗證 CreateOrder 委派 PurchaseContext 並使用 OrderMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { OrderDTO } from '../../../src/Application/DTOs/OrderDTO'
import { FlashSaleError, FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { CreateOrder } from '../../../src/Application/UseCases/CreateOrder'
import type { IOrderRepository } from '../../../src/Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../../src/Domain/Contracts/IProductRepository'
import type { Order } from '../../../src/Domain/Entities/Order'
import { Product } from '../../../src/Domain/Entities/Product'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

/**
 * Mock IProductRepository（Domain 層 Contract）
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
 * Mock IOrderRepository（Domain 層 Contract）
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

describe('CreateOrder UseCase (thin shell)', () => {
  let productRepo: MockProductRepository
  let orderRepo: MockOrderRepository
  let useCase: CreateOrder

  beforeEach(() => {
    productRepo = new MockProductRepository()
    orderRepo = new MockOrderRepository()
    useCase = new CreateOrder(productRepo, orderRepo)

    // 添加測試商品
    const product = Product.create(
      'PROD-1',
      'Flash Sale Item',
      'FSI-001',
      'Limited item',
      Money.of(50),
      Money.of(25),
      Stock.of(100),
      []
    )
    productRepo.addProduct(product)
  })

  it('should create order and return OrderDTO', async () => {
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
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unitPrice).toBe(50)
    expect(result.items[0].totalPrice).toBe(100)
  })

  it('should throw FlashSaleError when product not found', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'NONEXISTENT',
        quantity: 1,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
    }
  })

  it('should throw FlashSaleError when insufficient stock', async () => {
    // 建立只有 2 個庫存的商品
    const lowStockProduct = Product.create(
      'PROD-LOW',
      'Low Stock',
      'LS-001',
      'desc',
      Money.of(100),
      Money.of(50),
      Stock.of(2),
      []
    )
    productRepo.addProduct(lowStockProduct)

    try {
      await useCase.execute({
        userId: 'USER-1',
        productId: 'PROD-LOW',
        quantity: 5,
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
    }
  })

  it('should deduct stock after order creation', async () => {
    await useCase.execute({
      userId: 'USER-1',
      productId: 'PROD-1',
      quantity: 3,
    })

    const product = await productRepo.findById('PROD-1')
    expect(product?.stock.quantity).toBe(97) // 100 - 3
  })
})
