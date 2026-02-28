/**
 * CreateBulkOrder UseCase (薄殼) 單元測試
 *
 * 驗證 CreateBulkOrder 委派 BulkPurchaseContext 並使用 OrderMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { OrderDTO } from '../../../src/Application/DTOs/OrderDTO'
import { FlashSaleError, FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { CreateBulkOrder } from '../../../src/Application/UseCases/CreateBulkOrder'
import type { IOrderRepository } from '../../../src/Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../../src/Domain/Contracts/IProductRepository'
import type { Order } from '../../../src/Domain/Entities/Order'
import { Product } from '../../../src/Domain/Entities/Product'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
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

  async findByIds(ids: string[]): Promise<Product[]> {
    return ids.flatMap((id) => {
      const product = this.products.get(id)
      return product ? [product] : []
    })
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

describe('CreateBulkOrder UseCase (thin shell)', () => {
  let productRepo: MockProductRepository
  let orderRepo: MockOrderRepository
  let useCase: CreateBulkOrder

  beforeEach(() => {
    productRepo = new MockProductRepository()
    orderRepo = new MockOrderRepository()
    useCase = new CreateBulkOrder(productRepo, orderRepo)

    // 添加測試商品
    const product1 = Product.create(
      'PROD-1',
      'Flash Sale Item 1',
      'FSI-001',
      'Limited item 1',
      Money.of(50),
      Money.of(25),
      Stock.of(100),
      []
    )
    const product2 = Product.create(
      'PROD-2',
      'Flash Sale Item 2',
      'FSI-002',
      'Limited item 2',
      Money.of(100),
      Money.of(50),
      Stock.of(50),
      []
    )
    productRepo.addProduct(product1)
    productRepo.addProduct(product2)
  })

  it('should create bulk order with multiple items and return OrderDTO', async () => {
    const result = await useCase.execute({
      userId: 'USER-1',
      items: [
        { productId: 'PROD-1', quantity: 2 },
        { productId: 'PROD-2', quantity: 3 },
      ],
    })

    expect(result.id).toBeTruthy()
    expect(result.userId).toBe('USER-1')
    expect(result.status).toBe(OrderStatus.PENDING)
    expect(result.items).toHaveLength(2)

    // 驗證第一個項目
    expect(result.items[0].productId).toBe('PROD-1')
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].unitPrice).toBe(50)
    expect(result.items[0].totalPrice).toBe(100) // 50 * 2

    // 驗證第二個項目
    expect(result.items[1].productId).toBe('PROD-2')
    expect(result.items[1].quantity).toBe(3)
    expect(result.items[1].unitPrice).toBe(100)
    expect(result.items[1].totalPrice).toBe(300) // 100 * 3

    // 驗證總金額
    expect(result.totalAmount).toBe(400) // 100 + 300
  })

  it('should throw FlashSaleError when any product not found', async () => {
    try {
      await useCase.execute({
        userId: 'USER-1',
        items: [
          { productId: 'PROD-1', quantity: 1 },
          { productId: 'NONEXISTENT', quantity: 1 },
        ],
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
    }
  })

  it('should throw FlashSaleError when any product has insufficient stock', async () => {
    // 建立庫存不足的商品
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
        items: [
          { productId: 'PROD-1', quantity: 1 },
          { productId: 'PROD-LOW', quantity: 5 }, // 要求 5 個，但只有 2 個
        ],
      })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
    }
  })

  it('should deduct stock for all items after bulk order creation', async () => {
    await useCase.execute({
      userId: 'USER-1',
      items: [
        { productId: 'PROD-1', quantity: 3 },
        { productId: 'PROD-2', quantity: 5 },
      ],
    })

    const product1 = await productRepo.findById('PROD-1')
    const product2 = await productRepo.findById('PROD-2')

    expect(product1?.stock.quantity).toBe(97) // 100 - 3
    expect(product2?.stock.quantity).toBe(45) // 50 - 5
  })
})
