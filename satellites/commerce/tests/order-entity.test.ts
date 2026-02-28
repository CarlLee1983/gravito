/**
 * Order Entity 補充測試
 *
 * 補充 domain-entities.test.ts 未涵蓋的測試場景，
 * 重點：CommerceError 拋出、狀態轉移完整性
 */

import { describe, expect, it } from 'bun:test'
import { CommerceError, CommerceErrorCode } from '../src/Application/Errors/CommerceError'
import { Order, OrderStatus } from '../src/Domain/Entities/Order'
import { Adjustment, AdjustmentType } from '../src/Domain/ValueObjects/Adjustment'
import { LineItem } from '../src/Domain/ValueObjects/LineItem'
import { Money } from '../src/Domain/ValueObjects/Money'

const makeItem = (price = 100, qty = 1): LineItem =>
  LineItem.create('prod-1', 'var-1', 'SKU-001', 'Test Product', Money.of(price, 'TWD'), qty)

const makeAdj = (amount: number): Adjustment =>
  Adjustment.create(AdjustmentType.DISCOUNT, 'Test Adj', Money.of(amount, 'TWD'))

describe('Order Entity - CommerceError 拋出', () => {
  describe('addItem 狀態限制', () => {
    it('PAID 狀態新增商品應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      try {
        order.addItem(makeItem())
        expect.unreachable('應拋出錯誤')
      } catch (e) {
        expect(e).toBeInstanceOf(CommerceError)
        expect((e as CommerceError).code).toBe(CommerceErrorCode.INVALID_STATUS_TRANSITION)
      }
    })

    it('CANCELLED 狀態新增商品應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.cancel()

      expect(() => order.addItem(makeItem())).toThrow(CommerceError)
    })
  })

  describe('addAdjustment 狀態限制', () => {
    it('SHIPPED 狀態新增調整應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()
      order.markAsProcessing()
      order.markAsShipped()

      expect(() => order.addAdjustment(makeAdj(-100))).toThrow(CommerceError)
    })
  })

  describe('cancel 狀態限制', () => {
    it('PAID 訂單取消應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      try {
        order.cancel()
        expect.unreachable('應拋出錯誤')
      } catch (e) {
        expect(e).toBeInstanceOf(CommerceError)
        expect((e as CommerceError).code).toBe(CommerceErrorCode.INVALID_STATUS_TRANSITION)
      }
    })

    it('COMPLETED 訂單取消應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()
      order.markAsProcessing()
      order.markAsShipped()
      order.markAsCompleted()

      expect(() => order.cancel()).toThrow(CommerceError)
    })
  })

  describe('refund 狀態限制', () => {
    it('markAsRefunded 從非 REQUESTED_REFUND 狀態應拋出 CommerceError', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      try {
        order.markAsRefunded()
        expect.unreachable('應拋出錯誤')
      } catch (e) {
        expect(e).toBeInstanceOf(CommerceError)
        expect((e as CommerceError).code).toBe(CommerceErrorCode.INVALID_STATUS_TRANSITION)
      }
    })
  })
})

describe('Order Entity - 重建（reconstitute）', () => {
  it('應從 props 重建訂單', () => {
    const item = makeItem(500, 2)
    const adj = makeAdj(-50)

    const order = Order.reconstitute('ord-recon', {
      memberId: 'mem-1',
      idempotencyKey: 'idem-abc',
      status: OrderStatus.PAID,
      subtotal: Money.of(1000, 'TWD'),
      adjustmentAmount: Money.of(-50, 'TWD'),
      total: Money.of(950, 'TWD'),
      currency: 'TWD',
      items: [item],
      adjustments: [adj],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    })

    expect(order.id).toBe('ord-recon')
    expect(order.memberId).toBe('mem-1')
    expect(order.idempotencyKey).toBe('idem-abc')
    expect(order.status).toBe(OrderStatus.PAID)
    expect(order.currency).toBe('TWD')
    expect(order.items).toHaveLength(1)
    expect(order.adjustments).toHaveLength(1)
  })

  it('應支持無 idempotencyKey 的重建', () => {
    const order = Order.reconstitute('ord-no-idem', {
      memberId: null,
      status: OrderStatus.PENDING,
      subtotal: Money.of(0, 'TWD'),
      adjustmentAmount: Money.of(0, 'TWD'),
      total: Money.of(0, 'TWD'),
      currency: 'TWD',
      items: [],
      adjustments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    expect(order.idempotencyKey).toBeUndefined()
    expect(order.memberId).toBeNull()
  })
})

describe('Order Entity - toProps', () => {
  it('應正確序列化所有屬性', () => {
    const order = Order.create('ord-1', 'mem-1', 'idem-1', 'TWD')
    const item = makeItem(300, 2)
    order.addItem(item)

    const props = order.toProps()

    expect(props.memberId).toBe('mem-1')
    expect(props.idempotencyKey).toBe('idem-1')
    expect(props.status).toBe(OrderStatus.PENDING)
    expect(props.currency).toBe('TWD')
    expect(props.subtotal.value).toBe(600)
    expect(props.items).toHaveLength(1)
  })
})
