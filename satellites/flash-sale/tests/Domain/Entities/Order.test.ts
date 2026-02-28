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

  describe('confirm (狀態機)', () => {
    it('應從 PENDING 轉為 CONFIRMED', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.pullDomainEvents() // 清除 OrderCreated event

      order.confirm()

      expect(order.status).toBe(OrderStatus.CONFIRMED)
    })

    it('確認時應添加 OrderConfirmed Domain Event', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.pullDomainEvents() // 清除 OrderCreated event

      order.confirm()
      const events = order.pullDomainEvents()

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(OrderConfirmed)
    })

    it('非 PENDING 狀態不能確認，應拋出 INVALID_ORDER_STATUS', () => {
      const items = createItems()
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items,
        totalAmount: Money.of(250),
        status: OrderStatus.PAID,
        createdAt: new Date(),
      })

      try {
        order.confirm()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }
    })
  })

  describe('markAsPaid (狀態機)', () => {
    it('應從 CONFIRMED 轉為 PAID', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.confirm()

      order.markAsPaid()

      expect(order.status).toBe(OrderStatus.PAID)
    })

    it('非 CONFIRMED 狀態不能付款，應拋出 INVALID_ORDER_STATUS', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)

      try {
        order.markAsPaid() // 目前是 PENDING，不能直接付款
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }
    })
  })

  describe('cancel (狀態機)', () => {
    it('應從 PENDING 取消', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)

      order.cancel()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('應從 CONFIRMED 取消', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.confirm()

      order.cancel()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('應從 PAID 取消', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.confirm()
      order.markAsPaid()

      order.cancel()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('已取消的訂單不能再次取消', () => {
      const items = createItems()
      const order = Order.create('order-1', 'user-1', items)
      order.cancel()

      try {
        order.cancel()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }
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
