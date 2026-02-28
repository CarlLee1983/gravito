/**
 * MockOrderRepository 單元測試
 *
 * 驗證 Repository 返回 Order Entity（非 raw object）
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'
import { MockOrderRepository } from '../../../src/Infrastructure/Repositories/MockOrderRepository'

describe('MockOrderRepository (Entity-based)', () => {
  let repo: MockOrderRepository

  function createTestOrder(id: string, userId: string): Order {
    const item = OrderItem.create('prod-1', 'Product A', 2, Money.of(50))
    return Order.create(id, userId, [item])
  }

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  describe('save', () => {
    it('should persist an Order Entity', async () => {
      const order = createTestOrder('order-001', 'user-123')
      await repo.save(order)

      const found = await repo.findById('order-001')
      expect(found).not.toBeNull()
      expect(found).toBeInstanceOf(Order)
      expect(found!.id).toBe('order-001')
      expect(found!.userId).toBe('user-123')
    })

    it('should preserve Order Entity properties after save', async () => {
      const order = createTestOrder('order-002', 'user-456')
      await repo.save(order)

      const found = await repo.findById('order-002')
      expect(found!.status).toBe(OrderStatus.PENDING)
      expect(found!.totalAmount.value).toBe(100) // 2 * 50
      expect(found!.items).toHaveLength(1)
      expect(found!.items[0].productId).toBe('prod-1')
    })
  })

  describe('findById', () => {
    it('should return Order Entity', async () => {
      const order = createTestOrder('order-001', 'user-123')
      await repo.save(order)

      const found = await repo.findById('order-001')
      expect(found).toBeInstanceOf(Order)
    })

    it('should return null for non-existent order', async () => {
      const found = await repo.findById('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('should return Order Entities for a user', async () => {
      await repo.save(createTestOrder('order-001', 'user-123'))
      await repo.save(createTestOrder('order-002', 'user-123'))
      await repo.save(createTestOrder('order-003', 'user-999'))

      const orders = await repo.findByUserId('user-123')

      expect(orders).toHaveLength(2)
      for (const order of orders) {
        expect(order).toBeInstanceOf(Order)
        expect(order.userId).toBe('user-123')
      }
    })

    it('should return empty array when user has no orders', async () => {
      const orders = await repo.findByUserId('no-orders-user')
      expect(orders).toHaveLength(0)
    })
  })

  describe('findByDateRange', () => {
    it('should return Order Entities within date range', async () => {
      const order = createTestOrder('order-001', 'user-123')
      await repo.save(order)

      const now = new Date()
      const past = new Date(now.getTime() - 60000) // 1 minute ago
      const future = new Date(now.getTime() + 60000)

      const orders = await repo.findByDateRange(past, future)

      expect(orders.length).toBeGreaterThan(0)
      for (const o of orders) {
        expect(o).toBeInstanceOf(Order)
      }
    })
  })

  describe('findAll', () => {
    it('should return all Order Entities', async () => {
      await repo.save(createTestOrder('order-001', 'user-123'))
      await repo.save(createTestOrder('order-002', 'user-456'))

      const orders = await repo.findAll()

      expect(orders).toHaveLength(2)
      for (const order of orders) {
        expect(order).toBeInstanceOf(Order)
      }
    })
  })

  describe('exists', () => {
    it('should return true for existing order', async () => {
      await repo.save(createTestOrder('order-001', 'user-123'))
      expect(await repo.exists('order-001')).toBe(true)
    })

    it('should return false for non-existent order', async () => {
      expect(await repo.exists('nonexistent')).toBe(false)
    })
  })

  describe('delete', () => {
    it('should remove order from repository', async () => {
      await repo.save(createTestOrder('order-001', 'user-123'))
      await repo.delete('order-001')

      const found = await repo.findById('order-001')
      expect(found).toBeNull()
    })
  })

  describe('reset', () => {
    it('should clear all orders', async () => {
      await repo.save(createTestOrder('order-001', 'user-123'))
      await repo.reset()

      const orders = await repo.findAll()
      expect(orders).toHaveLength(0)
    })
  })
})
