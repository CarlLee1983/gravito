import { describe, expect, it } from 'bun:test'
import { Order, OrderStatus } from '../src/Domain/Entities/Order'
import { Adjustment, AdjustmentType } from '../src/Domain/ValueObjects/Adjustment'
import { LineItem } from '../src/Domain/ValueObjects/LineItem'
import { Money } from '../src/Domain/ValueObjects/Money'

describe('Commerce Domain - Money ValueObject', () => {
  describe('Money Creation & Operations', () => {
    it('應該建立 Money 實例', () => {
      const money = Money.of(99.99, 'TWD')
      expect(money.value).toBe(99.99)
      expect(money.amountInCents).toBe(9999)
      expect(money.currency).toBe('TWD')
    })

    it('應該支持加法', () => {
      const m1 = Money.of(50, 'TWD')
      const m2 = Money.of(30, 'TWD')
      const result = m1.add(m2)

      expect(result.value).toBe(80)
      expect(m1.value).toBe(50) // 原值不變（不可變）
    })

    it('應該支持乘法', () => {
      const money = Money.of(10, 'TWD')
      const result = money.multiply(5)

      expect(result.value).toBe(50)
      expect(money.value).toBe(10) // 原值不變
    })

    it('應該檢查是否大於另一個 Money', () => {
      const m1 = Money.of(100, 'TWD')
      const m2 = Money.of(50, 'TWD')

      expect(m1.isGreaterThan(m2)).toBe(true)
      expect(m2.isGreaterThan(m1)).toBe(false)
    })

    it('不同幣別的操作應拋出錯誤', () => {
      const m1 = Money.of(100, 'TWD')
      const m2 = Money.of(100, 'USD')

      expect(() => m1.add(m2)).toThrow()
    })
  })
})

describe('Commerce Domain - Order AggregateRoot', () => {
  describe('Order Creation & Initial State', () => {
    it('應該建立初始狀態為 pending 的訂單', () => {
      const order = Order.create('ord-1', 'mem-123')

      expect(order.id).toBe('ord-1')
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.memberId).toBe('mem-123')
      expect(order.subtotal.value).toBe(0)
      expect(order.adjustmentAmount.value).toBe(0)
      expect(order.total.value).toBe(0)
      expect(order.items).toHaveLength(0)
      expect(order.adjustments).toHaveLength(0)
      expect(order.createdAt).toBeDefined()
    })

    it('應該支持無會員訂單', () => {
      const order = Order.create('ord-1', null)
      expect(order.memberId).toBeNull()
    })

    it('應該使用預設幣別 TWD', () => {
      const order = Order.create('ord-1')
      expect(order.currency).toBe('TWD')
      expect(order.status).toBe(OrderStatus.PENDING)
    })
  })

  describe('Adding Items & Recalculation', () => {
    it('應該能新增商品並重新計算金額', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')
      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(500, 'TWD'), 2)

      order.addItem(item)

      expect(order.items).toHaveLength(1)
      expect(order.subtotal.value).toBe(1000)
      expect(order.total.value).toBe(1000)
    })

    it('應該累加多個商品', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')
      const item1 = LineItem.create(
        'prod-1',
        'var-1',
        'SKU-001',
        'T-Shirt',
        Money.of(500, 'TWD'),
        2
      )
      const item2 = LineItem.create('prod-2', 'var-2', 'SKU-002', 'Pants', Money.of(1000, 'TWD'), 1)

      order.addItem(item1)
      order.addItem(item2)

      expect(order.items).toHaveLength(2)
      expect(order.subtotal.value).toBe(2000)
      expect(order.total.value).toBe(2000)
    })

    it('非 pending 狀態時，新增商品應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(500, 'TWD'), 1)

      expect(() => order.addItem(item)).toThrow()
    })
  })

  describe('Adding Adjustments & Recalculation', () => {
    it('應該能新增折扣調整', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')
      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(500, 'TWD'), 1)
      order.addItem(item)

      const discount = Adjustment.create(
        AdjustmentType.DISCOUNT,
        '10% off',
        Money.of(-50, 'TWD'),
        'coupon',
        'coup-1'
      )
      order.addAdjustment(discount)

      expect(order.adjustments).toHaveLength(1)
      expect(order.adjustmentAmount.value).toBe(-50)
      expect(order.total.value).toBe(450)
    })

    it('應該能處理正向和負向調整', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')
      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(500, 'TWD'), 1)
      order.addItem(item)

      const discount = Adjustment.create(AdjustmentType.DISCOUNT, 'Discount', Money.of(-100, 'TWD'))
      const tax = Adjustment.create(AdjustmentType.TAX, 'Tax', Money.of(50, 'TWD'))

      order.addAdjustment(discount)
      order.addAdjustment(tax)

      expect(order.adjustmentAmount.value).toBe(-50)
      expect(order.total.value).toBe(450)
    })

    it('非 pending 狀態時，新增調整應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      const adj = Adjustment.create(AdjustmentType.DISCOUNT, 'Test', Money.of(-100, 'TWD'))

      expect(() => order.addAdjustment(adj)).toThrow()
    })
  })

  describe('Order Status Transitions', () => {
    it('應該能從 pending 轉移到 paid', () => {
      const order = Order.create('ord-1')
      expect(order.status).toBe(OrderStatus.PENDING)

      order.markAsPaid()
      expect(order.status).toBe(OrderStatus.PAID)
    })

    it('非 pending 時，markAsPaid 應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      expect(() => order.markAsPaid()).toThrow()
    })

    it('應該能從 paid 狀態請求退款', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      order.requestRefund()
      expect(order.status).toBe(OrderStatus.REQUESTED_REFUND)
    })

    it('應該能完整流轉訂單狀態', () => {
      const order = Order.create('ord-1')
      expect(order.status).toBe(OrderStatus.PENDING)

      order.markAsPaid()
      expect(order.status).toBe(OrderStatus.PAID)

      order.markAsProcessing()
      expect(order.status).toBe(OrderStatus.PROCESSING)

      order.markAsShipped()
      expect(order.status).toBe(OrderStatus.SHIPPED)

      order.markAsCompleted()
      expect(order.status).toBe(OrderStatus.COMPLETED)
    })

    it('應該能從 completed 狀態請求退款', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()
      order.markAsProcessing()
      order.markAsShipped()
      order.markAsCompleted()

      order.requestRefund()
      expect(order.status).toBe(OrderStatus.REQUESTED_REFUND)

      order.markAsRefunded()
      expect(order.status).toBe(OrderStatus.REFUNDED)
    })
  })

  describe('Total Amount Calculation Edge Cases', () => {
    it('總金額不應為負數', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')
      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(100, 'TWD'), 1)
      order.addItem(item)

      const largeDiscount = Adjustment.create(
        AdjustmentType.DISCOUNT,
        'Large discount',
        Money.of(-1000, 'TWD')
      )
      order.addAdjustment(largeDiscount)

      expect(order.total.value).toBe(0)
    })

    it('應該正確計算複雜的多項商品和調整場景', () => {
      const order = Order.create('ord-1', 'mem-123', undefined, 'TWD')

      // 加入 3 件商品
      for (let i = 1; i <= 3; i++) {
        const item = LineItem.create(
          `prod-${i}`,
          `var-${i}`,
          `SKU-${i}`,
          `Product ${i}`,
          Money.of(1000 * i, 'TWD'),
          1
        )
        order.addItem(item)
      }

      expect(order.subtotal.value).toBe(6000) // 1000 + 2000 + 3000

      // 加入折扣和運費
      const coupon = Adjustment.create(
        AdjustmentType.DISCOUNT,
        '20% discount',
        Money.of(-1200, 'TWD'),
        'coupon',
        'coup-1'
      )
      const shipping = Adjustment.create(AdjustmentType.SHIPPING, 'Shipping', Money.of(200, 'TWD'))

      order.addAdjustment(coupon)
      order.addAdjustment(shipping)

      expect(order.adjustmentAmount.value).toBe(-1000)
      expect(order.total.value).toBe(5000)
    })
  })

  describe('Immutability', () => {
    it('items getter 應返回副本，不暴露內部陣列', () => {
      const order = Order.create('ord-1')
      const item = LineItem.create('prod-1', 'var-1', 'SKU-001', 'T-Shirt', Money.of(500, 'TWD'), 1)
      order.addItem(item)

      const items1 = order.items
      const items2 = order.items

      expect(items1).not.toBe(items2) // 不同的陣列引用
      expect(items1).toEqual(items2) // 但內容相同
    })

    it('adjustments getter 應返回副本', () => {
      const order = Order.create('ord-1')
      const adj = Adjustment.create(AdjustmentType.DISCOUNT, 'Test', Money.of(-100, 'TWD'))
      order.addAdjustment(adj)

      const adjs1 = order.adjustments
      const adjs2 = order.adjustments

      expect(adjs1).not.toBe(adjs2)
      expect(adjs1).toEqual(adjs2)
    })
  })
})
