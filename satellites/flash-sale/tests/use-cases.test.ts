import { describe, expect, it } from 'bun:test'
import type { IOrderRepository } from '../src/Application/Contracts/IOrderRepository'
import { ConfirmOrder } from '../src/Application/UseCases/ConfirmOrder'
import { GetOrder } from '../src/Application/UseCases/GetOrder'
import type { Order } from '../src/Domain/Models'
import { OrderStatus } from '../src/Domain/Models'

/**
 * Mock Order Repository
 */
class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async create(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  async update(id: string, order: Order): Promise<void> {
    this.orders.set(id, order)
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id)
  }

  async listByStatus(status: OrderStatus): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.status === status)
  }

  setOrder(order: Order): void {
    this.orders.set(order.id, order)
  }
}

/**
 * Mock Cache Service
 */
class MockCacheService {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.value as T
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

describe('Flash-Sale UseCases', () => {
  describe('GetOrder', () => {
    it('應該能成功查詢訂單', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new GetOrder(repository)
      const result = await useCase.execute('ord-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('ord-1')
      expect(result?.status).toBe(OrderStatus.PENDING)
    })

    it('當訂單不存在時應返回 null', async () => {
      const repository = new MockOrderRepository()
      const useCase = new GetOrder(repository)

      const result = await useCase.execute('nonexistent')

      expect(result).toBeNull()
    })

    it('應該拒絕空的訂單 ID', async () => {
      const repository = new MockOrderRepository()
      const useCase = new GetOrder(repository)

      try {
        await useCase.execute('')
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('Order ID is required')
      }
    })

    it('應該快取查詢結果 60 秒', async () => {
      const repository = new MockOrderRepository()
      const cache = new MockCacheService()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new GetOrder(repository, cache)

      // 第一次查詢，從數據庫讀取
      const result1 = await useCase.execute('ord-1')
      expect(result1?.id).toBe('ord-1')

      // 從快取中刪除訂單
      repository.delete('ord-1')

      // 第二次查詢，應從快取讀取
      const result2 = await useCase.execute('ord-1')
      expect(result2?.id).toBe('ord-1')
    })

    it('當無快取服務時應直接查詢數據庫', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new GetOrder(repository) // 無快取服務

      const result = await useCase.execute('ord-1')

      expect(result?.id).toBe('ord-1')
    })
  })

  describe('ConfirmOrder', () => {
    it('應該能成功確認 PENDING 訂單', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new ConfirmOrder(repository)
      const result = await useCase.execute({
        orderId: 'ord-1',
        lockId: 'lock-123',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('confirmed successfully')

      // 驗證狀態已更新
      const updated = await repository.findById('ord-1')
      expect(updated?.status).toBe(OrderStatus.CONFIRMED)
    })

    it('當訂單不存在時應拋出錯誤', async () => {
      const repository = new MockOrderRepository()
      const useCase = new ConfirmOrder(repository)

      try {
        await useCase.execute({
          orderId: 'nonexistent',
          lockId: 'lock-123',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('Order not found')
      }
    })

    it('當訂單狀態不是 PENDING 時應拋出錯誤', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new ConfirmOrder(repository)

      try {
        await useCase.execute({
          orderId: 'ord-1',
          lockId: 'lock-123',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('not PENDING')
      }
    })

    it('應該設置 confirmedAt 時間戳', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const beforeTime = new Date()
      const useCase = new ConfirmOrder(repository)
      await useCase.execute({
        orderId: 'ord-1',
        lockId: 'lock-123',
      })
      const afterTime = new Date()

      const updated = await repository.findById('ord-1')
      expect(updated).toBeDefined()
      expect(updated?.confirmedAt).toBeDefined()
      if (updated?.confirmedAt) {
        expect(updated.confirmedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
        expect(updated.confirmedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
      }
    })

    it('應該能確認多個訂單', async () => {
      const repository = new MockOrderRepository()

      for (let i = 1; i <= 3; i++) {
        const order: Order = {
          id: `ord-${i}`,
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        }
        repository.setOrder(order)
      }

      const useCase = new ConfirmOrder(repository)

      for (let i = 1; i <= 3; i++) {
        const result = await useCase.execute({
          orderId: `ord-${i}`,
          lockId: `lock-${i}`,
        })
        expect(result.success).toBe(true)
      }

      // 驗證所有訂單都已確認
      for (let i = 1; i <= 3; i++) {
        const order = await repository.findById(`ord-${i}`)
        expect(order?.status).toBe(OrderStatus.CONFIRMED)
      }
    })
  })

  describe('Order Status Workflow', () => {
    it('應該能完整流程：建立 → 查詢 → 確認', async () => {
      const repository = new MockOrderRepository()
      const cache = new MockCacheService()

      // 1. 建立訂單
      const order: Order = {
        id: 'ord-1',
        productId: 'prod-1',
        quantity: 5,
        unitPrice: 200,
        totalPrice: 1000,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }
      repository.setOrder(order)

      // 2. 查詢訂單
      const getOrderUseCase = new GetOrder(repository, cache)
      const fetched = await getOrderUseCase.execute('ord-1')
      expect(fetched?.status).toBe(OrderStatus.PENDING)

      // 3. 確認訂單
      const confirmOrderUseCase = new ConfirmOrder(repository)
      const result = await confirmOrderUseCase.execute({
        orderId: 'ord-1',
        lockId: 'lock-123',
      })
      expect(result.success).toBe(true)

      // 4. 驗證最終狀態（清除快取後重新查詢）
      cache.clear()
      const verified = await getOrderUseCase.execute('ord-1')
      expect(verified?.status).toBe(OrderStatus.CONFIRMED)
    })
  })

  describe('Edge Cases', () => {
    it('應該能處理大量訂單的快取', async () => {
      const repository = new MockOrderRepository()
      const cache = new MockCacheService()
      const useCase = new GetOrder(repository, cache)

      // 建立 100 個訂單
      for (let i = 1; i <= 100; i++) {
        const order: Order = {
          id: `ord-${i}`,
          productId: `prod-${i}`,
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        }
        repository.setOrder(order)
      }

      // 查詢所有訂單（應快取）
      for (let i = 1; i <= 100; i++) {
        const result = await useCase.execute(`ord-${i}`)
        expect(result?.id).toBe(`ord-${i}`)
      }

      // 刪除所有訂單
      for (let i = 1; i <= 100; i++) {
        await repository.delete(`ord-${i}`)
      }

      // 應仍能從快取獲取
      const result = await useCase.execute('ord-1')
      expect(result?.id).toBe('ord-1')
    })

    it('應該能處理高價值訂單', async () => {
      const repository = new MockOrderRepository()
      const order: Order = {
        id: 'ord-vip',
        productId: 'prod-premium',
        quantity: 1000,
        unitPrice: 10000,
        totalPrice: 10000000,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      }

      repository.setOrder(order)

      const useCase = new GetOrder(repository)
      const result = await useCase.execute('ord-vip')

      expect(result?.totalPrice).toBe(10000000)
    })
  })
})
