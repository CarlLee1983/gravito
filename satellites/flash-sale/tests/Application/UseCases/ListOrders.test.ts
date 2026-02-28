/**
 * ListOrders UseCase (薄殼) 單元測試
 *
 * 驗證 ListOrders 委派 OrderLifecycleContext 並使用 OrderMapper 轉換
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { ListOrders } from '../../../src/Application/UseCases/ListOrders'
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

  async findByUserId(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.userId === userId)
  }

  async findByDateRange(): Promise<Order[]> {
    return []
  }
}

describe('ListOrders UseCase (thin shell)', () => {
  let orderRepo: MockOrderRepository
  let useCase: ListOrders

  beforeEach(() => {
    orderRepo = new MockOrderRepository()
    useCase = new ListOrders(orderRepo)

    // 建立測試訂單
    const item1 = OrderItem.create('prod-1', 'Product A', 2, Money.of(50))
    const order1 = Order.create('order-001', 'user-123', [item1])
    orderRepo.addOrder(order1)

    const item2 = OrderItem.create('prod-2', 'Product B', 1, Money.of(100))
    const order2 = Order.create('order-002', 'user-123', [item2])
    orderRepo.addOrder(order2)

    const item3 = OrderItem.create('prod-3', 'Product C', 3, Money.of(30))
    const order3 = Order.create('order-003', 'user-999', [item3])
    orderRepo.addOrder(order3)
  })

  it('should return OrderDTO list for a specific user', async () => {
    const result = await useCase.execute('user-123')

    expect(result).toHaveLength(2)
    expect(result[0].userId).toBe('user-123')
    expect(result[1].userId).toBe('user-123')
  })

  it('should return empty array when user has no orders', async () => {
    const result = await useCase.execute('user-no-orders')
    expect(result).toHaveLength(0)
  })

  it('should convert Money values to decimal in DTOs', async () => {
    const result = await useCase.execute('user-123')

    const order1 = result.find((o) => o.id === 'order-001')
    expect(order1?.totalAmount).toBe(100) // 2 * 50
    expect(order1?.items[0].unitPrice).toBe(50)

    const order2 = result.find((o) => o.id === 'order-002')
    expect(order2?.totalAmount).toBe(100) // 1 * 100
  })
})
