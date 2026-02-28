/**
 * ConfirmOrder UseCase (薄殼) 單元測試
 *
 * 驗證 ConfirmOrder 委派 OrderLifecycleContext 並使用 OrderMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { FlashSaleError, FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { ConfirmOrder } from '../../../src/Application/UseCases/ConfirmOrder'
import type { IOrderRepository } from '../../../src/Domain/Contracts/IOrderRepository'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

/**
 * Mock IOrderRepository（Domain 層 Contract）
 */
class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()

  addOrder(order: Order): void {
    this.orders.set(order.id, order)
  }

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

describe('ConfirmOrder UseCase (thin shell)', () => {
  let orderRepo: MockOrderRepository
  let useCase: ConfirmOrder

  beforeEach(() => {
    orderRepo = new MockOrderRepository()
    useCase = new ConfirmOrder(orderRepo)

    // 建立測試訂單
    const item = OrderItem.create('prod-1', 'Product A', 2, Money.of(50))
    const order = Order.create('order-001', 'user-123', [item])
    orderRepo.addOrder(order)
  })

  it('should confirm PENDING order and return OrderDTO', async () => {
    const result = await useCase.execute('order-001')

    expect(result.id).toBe('order-001')
    expect(result.status).toBe(OrderStatus.CONFIRMED)
    expect(result.totalAmount).toBe(100)
  })

  it('should throw FlashSaleError when order not found', async () => {
    try {
      await useCase.execute('nonexistent')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.ORDER_NOT_FOUND)
    }
  })

  it('should throw FlashSaleError when order is not PENDING', async () => {
    // 先確認訂單
    await useCase.execute('order-001')

    // 再次確認應該失敗
    try {
      await useCase.execute('order-001')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FlashSaleError)
      expect((error as FlashSaleError).code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
    }
  })

  it('should persist the confirmed state', async () => {
    await useCase.execute('order-001')

    const order = await orderRepo.findById('order-001')
    expect(order?.status).toBe(OrderStatus.CONFIRMED)
  })
})
