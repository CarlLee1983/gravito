import { describe, expect, it } from 'bun:test'
import { FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderConfirmed } from '../../../src/Domain/Events/OrderConfirmed'
import { OrderCreated } from '../../../src/Domain/Events/OrderCreated'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

describe('Order', () => {
  const createItems = () => [
    OrderItem.create('prod-1', 'Product A', 2, Money.of(100)),
    OrderItem.create('prod-2', 'Product B', 1, Money.of(50)),
  ]

  describe('create (靜態工廠方法)', () => {
    it('應正確建立 Order', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)

      expect(order.id).toBe('order-1')
      expect(order.userId).toBe('user-1')
      expect(order.items).toHaveLength(2)
      expect(order.status).toBe(OrderStatus.PENDING)
    })

    it('應自動計算 totalAmount（所有 items totalPrice 之和）', () => {
      const items = createItems()
      // item1: 100 * 2 = 200, item2: 50 * 1 = 50 → totalAmount = 250
      const order = Order.create('order-1', 'user-1', items)

      expect(order.totalAmount.value).toBe(250)
    })

    it('應自動添加 OrderCreated Domain Event', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(OrderCreated)
    })

    it('應拒絕空的 items 陣列', () => {
      expect(() => Order.create('order-1', 'user-1', [])).toThrow()
    })

    it('應拒絕空的 userId', () => {
      const items = createItems()

      expect(() => Order.create('order-1', '', items)).toThrow()
    })
  })

  describe('reconstitute (從 DB 重建)', () => {
    it('應正確重建 Order', () => {
      const items = createItems()
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items,
        totalAmount: Money.of(250),
        status: OrderStatus.CONFIRMED,
        createdAt: new Date('2024-01-01'),
      })

      expect(order.id).toBe('order-1')
      expect(order.status).toBe(OrderStatus.CONFIRMED)
      expect(order.totalAmount.value).toBe(250)
    })

    it('重建不應產生 Domain Events', () => {
      const items = createItems()
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items,
        totalAmount: Money.of(250),
        status: OrderStatus.PENDING,
        createdAt: new Date('2024-01-01'),
      })
      const events = order.pullDomainEvents()

      expect(events).toHaveLength(0)
    })
  })

  describe('transitionToConfirmed (狀態轉換)', () => {
    it('應轉換為 CONFIRMED 狀態', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.pullDomainEvents() // 清除 OrderCreated event

      order.transitionToConfirmed()

      expect(order.status).toBe(OrderStatus.CONFIRMED)
    })

    it('轉換時應添加 OrderConfirmed Domain Event', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.pullDomainEvents() // 清除 OrderCreated event

      order.transitionToConfirmed()
      const events = order.pullDomainEvents()

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(OrderConfirmed)
    })

    it('無論當前狀態如何，都應該能轉換（驗證由 Role 層負責）', () => {
      const items = createItems()
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items,
        totalAmount: Money.of(250),
        status: OrderStatus.PAID,
        createdAt: new Date(),
      })

      // DCI 設計：Entity 層不驗證，簡單地轉換
      order.transitionToConfirmed()
      expect(order.status).toBe(OrderStatus.CONFIRMED)
    })
  })

  describe('transitionToPaid (狀態轉換)', () => {
    it('應轉換為 PAID 狀態', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.transitionToConfirmed()

      order.transitionToPaid()

      expect(order.status).toBe(OrderStatus.PAID)
    })

    it('無論當前狀態如何，都應該能轉換（驗證由 Role 層負責）', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)

      // DCI 設計：Entity 層不驗證，簡單地轉換
      order.transitionToPaid()
      expect(order.status).toBe(OrderStatus.PAID)
    })
  })

  describe('transitionToCancelled (狀態轉換)', () => {
    it('應從 PENDING 轉換為 CANCELLED', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)

      order.transitionToCancelled()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('應從 CONFIRMED 轉換為 CANCELLED', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.transitionToConfirmed()

      order.transitionToCancelled()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('應從 PAID 轉換為 CANCELLED', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.transitionToConfirmed()
      order.transitionToPaid()

      order.transitionToCancelled()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('無論當前狀態如何，都應該能轉換（驗證由 Role 層負責）', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.transitionToCancelled()

      // DCI 設計：Entity 層不驗證，簡單地轉換
      order.transitionToCancelled()
      expect(order.status).toBe(OrderStatus.CANCELLED)
    })
  })

  describe('AggregateRoot identity', () => {
    it('相同 ID 的 Order 應相等', () => {
      const items = createItems()
      const a = Order.create('order-1', 'user-1', items)
      const b = Order.create('order-1', 'user-2', items)

      expect(a.equals(b)).toBe(true)
    })

    it('不同 ID 的 Order 應不相等', () => {
      const items = createItems()
      const a = Order.create('order-1', 'user-1', items)
      const b = Order.create('order-2', 'user-1', items)

      expect(a.equals(b)).toBe(false)
    })
  })
})
