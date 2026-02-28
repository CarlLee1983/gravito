/**
 * GetOrder UseCase (薄殼) 單元測試
 *
 * 驗證 GetOrder 委派 OrderLifecycleContext 並使用 OrderMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { GetOrder } from '../../../src/Application/UseCases/GetOrder'
import type { IOrderRepository } from '../../../src/Domain/Contracts/IOrderRepository'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

/**
 * Mock IOrderRepository
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

describe('GetOrder UseCase (thin shell)', () => {
  let orderRepo: MockOrderRepository
  let useCase: GetOrder

  beforeEach(() => {
    orderRepo = new MockOrderRepository()
    useCase = new GetOrder(orderRepo)

    // 建立測試訂單
    const item = OrderItem.create('prod-1', 'Product A', 2, Money.of(50))
    const order = Order.create('order-001', 'user-123', [item])
    orderRepo.addOrder(order)
  })

  it('should return OrderDTO for existing order', async () => {
    const result = await useCase.execute('order-001')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('order-001')
    expect(result!.userId).toBe('user-123')
    expect(result!.status).toBe(OrderStatus.PENDING)
    expect(result!.totalAmount).toBe(100) // 2 * 50
    expect(result!.items).toHaveLength(1)
  })

  it('should return null for non-existent order', async () => {
    const result = await useCase.execute('nonexistent')
    expect(result).toBeNull()
  })
})
