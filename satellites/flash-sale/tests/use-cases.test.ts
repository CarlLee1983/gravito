/**
 * Flash-Sale UseCases 整合測試
 *
 * 測試 UseCase 薄殼與 DCI Context 的整合
 */

import { describe, expect, it } from 'bun:test'
import { ConfirmOrder } from '../src/Application/UseCases/ConfirmOrder'
import { GetOrder } from '../src/Application/UseCases/GetOrder'
import type { IOrderRepository } from '../src/Domain/Contracts/IOrderRepository'
import { Order } from '../src/Domain/Entities/Order'
import { OrderStatus } from '../src/Domain/Models'
import { Money } from '../src/Domain/ValueObjects/Money'
import { OrderItem } from '../src/Domain/ValueObjects/OrderItem'

/**
 * Mock Order Repository（Domain Contract）
 */
class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async save(entity: Order): Promise<void> {
    this.orders.set(entity.id, entity)
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values())
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id)
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

  setOrder(order: Order): void {
    this.orders.set(order.id, order)
  }
}

/**
 * 建立測試用 Order Entity
 */
function createTestOrder(id: string, userId: string, status = OrderStatus.PENDING): Order {
  const item = OrderItem.create('prod-1', 'Product A', 2, Money.of(100))
  const order = Order.create(id, userId, [item])
  if (status === OrderStatus.CONFIRMED) {
    order.confirm()
  }
  return order
}

describe('Flash-Sale UseCases', () => {
  describe('GetOrder', () => {
    it('should return OrderDTO for existing order', async () => {
      const repository = new MockOrderRepository()
      const order = createTestOrder('ord-1', 'user-1')
      repository.setOrder(order)

      const useCase = new GetOrder(repository)
      const result = await useCase.execute('ord-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('ord-1')
      expect(result!.status).toBe(OrderStatus.PENDING)
      expect(result!.totalAmount).toBe(200) // 2 * 100
    })

    it('should return null for non-existent order', async () => {
      const repository = new MockOrderRepository()
      const useCase = new GetOrder(repository)

      const result = await useCase.execute('nonexistent')
      expect(result).toBeNull()
    })

    it('should return OrderDTO without cache', async () => {
      const repository = new MockOrderRepository()
      const order = createTestOrder('ord-1', 'user-1')
      repository.setOrder(order)

      const useCase = new GetOrder(repository)
      const result = await useCase.execute('ord-1')

      expect(result!.id).toBe('ord-1')
    })
  })

  describe('ConfirmOrder', () => {
    it('should confirm PENDING order and return OrderDTO', async () => {
      const repository = new MockOrderRepository()
      const order = createTestOrder('ord-1', 'user-1')
      repository.setOrder(order)

      const useCase = new ConfirmOrder(repository)
      const result = await useCase.execute('ord-1')

      expect(result.status).toBe(OrderStatus.CONFIRMED)
      expect(result.id).toBe('ord-1')
    })

    it('should throw when order not found', async () => {
      const repository = new MockOrderRepository()
      const useCase = new ConfirmOrder(repository)

      try {
        await useCase.execute('nonexistent')
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        expect(String(error)).toContain('Order not found')
      }
    })

    it('should throw when order is not PENDING', async () => {
      const repository = new MockOrderRepository()
      const order = createTestOrder('ord-1', 'user-1', OrderStatus.CONFIRMED)
      repository.setOrder(order)

      const useCase = new ConfirmOrder(repository)

      try {
        await useCase.execute('ord-1')
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        expect(String(error)).toContain('Invalid order status')
      }
    })

    it('should persist the confirmed state', async () => {
      const repository = new MockOrderRepository()
      const order = createTestOrder('ord-1', 'user-1')
      repository.setOrder(order)

      const useCase = new ConfirmOrder(repository)
      await useCase.execute('ord-1')

      // 驗證已持久化
      const saved = await repository.findById('ord-1')
      expect(saved!.status).toBe(OrderStatus.CONFIRMED)
    })

    it('should confirm multiple orders', async () => {
      const repository = new MockOrderRepository()

      for (let i = 1; i <= 3; i++) {
        const order = createTestOrder(`ord-${i}`, 'user-1')
        repository.setOrder(order)
      }

      const useCase = new ConfirmOrder(repository)

      for (let i = 1; i <= 3; i++) {
        const result = await useCase.execute(`ord-${i}`)
        expect(result.status).toBe(OrderStatus.CONFIRMED)
      }

      // 驗證所有訂單都已確認
      for (let i = 1; i <= 3; i++) {
        const order = await repository.findById(`ord-${i}`)
        expect(order!.status).toBe(OrderStatus.CONFIRMED)
      }
    })
  })

  describe('Order Status Workflow', () => {
    it('should handle create -> query -> confirm flow', async () => {
      const repository = new MockOrderRepository()

      // 1. 建立訂單
      const order = createTestOrder('ord-1', 'user-1')
      repository.setOrder(order)

      // 2. 查詢訂單
      const getOrderUseCase = new GetOrder(repository)
      const fetched = await getOrderUseCase.execute('ord-1')
      expect(fetched!.status).toBe(OrderStatus.PENDING)

      // 3. 確認訂單
      const confirmOrderUseCase = new ConfirmOrder(repository)
      const result = await confirmOrderUseCase.execute('ord-1')
      expect(result.status).toBe(OrderStatus.CONFIRMED)

      // 4. 驗證最終狀態
      const verified = await getOrderUseCase.execute('ord-1')
      expect(verified!.status).toBe(OrderStatus.CONFIRMED)
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple orders', async () => {
      const repository = new MockOrderRepository()
      const useCase = new GetOrder(repository)

      // 建立 100 個訂單
      for (let i = 1; i <= 100; i++) {
        const order = createTestOrder(`ord-${i}`, `user-${i}`)
        repository.setOrder(order)
      }

      // 查詢所有訂單
      for (let i = 1; i <= 100; i++) {
        const result = await useCase.execute(`ord-${i}`)
        expect(result!.id).toBe(`ord-${i}`)
      }

      // 刪除所有訂單
      for (let i = 1; i <= 100; i++) {
        await repository.delete(`ord-${i}`)
      }

      // 應返回 null
      const result = await useCase.execute('ord-1')
      expect(result).toBeNull()
    })

    it('should handle high-value orders', async () => {
      const repository = new MockOrderRepository()

      const item = OrderItem.create('prod-premium', 'Premium', 1000, Money.of(10000))
      const order = Order.create('ord-vip', 'user-vip', [item])
      repository.setOrder(order)

      const useCase = new GetOrder(repository)
      const result = await useCase.execute('ord-vip')

      expect(result!.totalAmount).toBe(10000000) // 1000 * 10000
    })
  })
})
