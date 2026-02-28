/**
 * DCI Roles 單元測試
 *
 * 測試 CheckoutableRole、OrderProcessorRole、RefundableRole
 */

import { describe, expect, it } from 'bun:test'
import { CommerceError } from '../src/Application/Errors/CommerceError'
import { injectCheckoutableRole } from '../src/Domain/DCI/Roles/CheckoutableRole'
import { injectOrderProcessorRole } from '../src/Domain/DCI/Roles/OrderProcessorRole'
import { injectRefundableRole } from '../src/Domain/DCI/Roles/RefundableRole'
import { Order, OrderStatus } from '../src/Domain/Entities/Order'
import { Adjustment, AdjustmentType } from '../src/Domain/ValueObjects/Adjustment'
import { LineItem } from '../src/Domain/ValueObjects/LineItem'
import { Money } from '../src/Domain/ValueObjects/Money'

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

const makeOrder = (status?: OrderStatus): Order => {
  const order = Order.create('ord-test', 'mem-1', undefined, 'TWD')
  if (status === OrderStatus.PAID) {
    order.markAsPaid()
  }
  if (status === OrderStatus.PROCESSING) {
    order.markAsPaid()
    order.markAsProcessing()
  }
  if (status === OrderStatus.SHIPPED) {
    order.markAsPaid()
    order.markAsProcessing()
    order.markAsShipped()
  }
  if (status === OrderStatus.COMPLETED) {
    order.markAsPaid()
    order.markAsProcessing()
    order.markAsShipped()
    order.markAsCompleted()
  }
  return order
}

const makeLineItem = (price = 100, qty = 1): LineItem =>
  LineItem.create('prod-1', 'var-1', 'SKU-001', 'Product A', Money.of(price, 'TWD'), qty)

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutableRole
// ─────────────────────────────────────────────────────────────────────────────

describe('CheckoutableRole', () => {
  describe('validateItems', () => {
    it('有效項目應通過驗證', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)
      const items = [makeLineItem(500, 2)]

      expect(() => role.validateItems(items)).not.toThrow()
    })

    it('空項目列表應拋出 CommerceError', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)

      expect(() => role.validateItems([])).toThrow(CommerceError)
    })

    it('null 項目應拋出 CommerceError', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)

      // biome-ignore lint/suspicious/noExplicitAny: 測試邊界情況
      expect(() => role.validateItems(null as any)).toThrow(CommerceError)
    })

    it('數量為 0 的項目應拋出 CommerceError', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)
      const items = [makeLineItem(100, 0)]

      expect(() => role.validateItems(items)).toThrow(CommerceError)
    })

    it('單價為負數的項目應拋出 CommerceError', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)
      const negativeItem = LineItem.create(
        'prod-1',
        'var-1',
        'SKU-001',
        'Item',
        Money.of(-10, 'TWD'),
        1
      )

      expect(() => role.validateItems([negativeItem])).toThrow(CommerceError)
    })
  })

  describe('applyAdjustments', () => {
    it('有效調整項應通過驗證', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)
      const adjustments = [
        Adjustment.create(AdjustmentType.DISCOUNT, '10% off', Money.of(-50, 'TWD')),
      ]

      expect(() => role.applyAdjustments(adjustments)).not.toThrow()
    })

    it('金額為 0 的調整項應拋出 CommerceError', () => {
      const order = makeOrder()
      const role = injectCheckoutableRole(order)
      const zeroAdj = [Adjustment.create(AdjustmentType.DISCOUNT, 'Zero', Money.of(0, 'TWD'))]

      expect(() => role.applyAdjustments(zeroAdj)).toThrow(CommerceError)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OrderProcessorRole
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderProcessorRole', () => {
  describe('confirmPayment', () => {
    it('PENDING 訂單應能確認付款', () => {
      const order = makeOrder()
      const role = injectOrderProcessorRole(order)

      role.confirmPayment()

      expect(order.status).toBe(OrderStatus.PAID)
    })

    it('非 PENDING 訂單確認付款應拋出 CommerceError', () => {
      const order = makeOrder(OrderStatus.PAID)
      const role = injectOrderProcessorRole(order)

      expect(() => role.confirmPayment()).toThrow(CommerceError)
    })
  })

  describe('markAsProcessing', () => {
    it('PAID 訂單應能轉為 PROCESSING', () => {
      const order = makeOrder(OrderStatus.PAID)
      const role = injectOrderProcessorRole(order)

      role.markAsProcessing()

      expect(order.status).toBe(OrderStatus.PROCESSING)
    })

    it('非 PAID 狀態應拋出 CommerceError', () => {
      const order = makeOrder() // PENDING
      const role = injectOrderProcessorRole(order)

      expect(() => role.markAsProcessing()).toThrow(CommerceError)
    })
  })

  describe('markAsShipped', () => {
    it('PROCESSING 訂單應能轉為 SHIPPED', () => {
      const order = makeOrder(OrderStatus.PROCESSING)
      const role = injectOrderProcessorRole(order)

      role.markAsShipped()

      expect(order.status).toBe(OrderStatus.SHIPPED)
    })

    it('非 PROCESSING 狀態應拋出 CommerceError', () => {
      const order = makeOrder(OrderStatus.PAID)
      const role = injectOrderProcessorRole(order)

      expect(() => role.markAsShipped()).toThrow(CommerceError)
    })
  })

  describe('markAsCompleted', () => {
    it('SHIPPED 訂單應能轉為 COMPLETED', () => {
      const order = makeOrder(OrderStatus.SHIPPED)
      const role = injectOrderProcessorRole(order)

      role.markAsCompleted()

      expect(order.status).toBe(OrderStatus.COMPLETED)
    })

    it('非 SHIPPED 狀態應拋出 CommerceError', () => {
      const order = makeOrder(OrderStatus.PROCESSING)
      const role = injectOrderProcessorRole(order)

      expect(() => role.markAsCompleted()).toThrow(CommerceError)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RefundableRole
// ─────────────────────────────────────────────────────────────────────────────

describe('RefundableRole', () => {
  describe('requestRefund', () => {
    it('PAID 訂單應能申請退款', () => {
      const order = makeOrder(OrderStatus.PAID)
      const role = injectRefundableRole(order)

      role.requestRefund()

      expect(order.status).toBe(OrderStatus.REQUESTED_REFUND)
    })

    it('PROCESSING 訂單應能申請退款', () => {
      const order = makeOrder(OrderStatus.PROCESSING)
      const role = injectRefundableRole(order)

      role.requestRefund()

      expect(order.status).toBe(OrderStatus.REQUESTED_REFUND)
    })

    it('COMPLETED 訂單應能申請退款', () => {
      const order = makeOrder(OrderStatus.COMPLETED)
      const role = injectRefundableRole(order)

      role.requestRefund()

      expect(order.status).toBe(OrderStatus.REQUESTED_REFUND)
    })

    it('PENDING 訂單不能申請退款', () => {
      const order = makeOrder() // PENDING
      const role = injectRefundableRole(order)

      expect(() => role.requestRefund()).toThrow(CommerceError)
    })

    it('CANCELLED 訂單不能申請退款', () => {
      const order = makeOrder() // PENDING
      order.cancel()
      const role = injectRefundableRole(order)

      expect(() => role.requestRefund()).toThrow(CommerceError)
    })
  })

  describe('approveRefund', () => {
    it('REQUESTED_REFUND 訂單應能批准退款', () => {
      const order = makeOrder(OrderStatus.PAID)
      order.requestRefund()
      const role = injectRefundableRole(order)

      role.approveRefund()

      expect(order.status).toBe(OrderStatus.REFUNDED)
    })

    it('非 REQUESTED_REFUND 狀態應拋出 CommerceError', () => {
      const order = makeOrder(OrderStatus.PAID)
      const role = injectRefundableRole(order)

      expect(() => role.approveRefund()).toThrow(CommerceError)
    })
  })
})
