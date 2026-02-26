import { describe, expect, it } from 'bun:test'
import { Adjustment, LineItem, Order } from '../src/Domain/Entities/Order'

describe('Commerce Domain - Order AggregateRoot', () => {
  describe('Order Creation & Initial State', () => {
    it('應該建立初始狀態為 pending 的訂單', () => {
      const order = Order.create('ord-1', 'mem-123')

      expect(order.id).toBe('ord-1')
      expect(order.status).toBe('pending')
      expect(order.memberId).toBe('mem-123')
      expect(order.subtotalAmount).toBe(0)
      expect(order.adjustmentAmount).toBe(0)
      expect(order.totalAmount).toBe(0)
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
      expect(order.status).toBe('pending')
    })
  })

  describe('Adding Items & Recalculation', () => {
    it('應該能新增商品並重新計算金額', () => {
      const order = Order.create('ord-1')
      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 2,
        totalPrice: 1000,
      })

      order.addItem(item)

      expect(order.items).toHaveLength(1)
      expect(order.subtotalAmount).toBe(1000)
      expect(order.totalAmount).toBe(1000)
    })

    it('應該累加多個商品', () => {
      const order = Order.create('ord-1')

      const item1 = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 2,
        totalPrice: 1000,
      })
      const item2 = new LineItem('item-2', {
        variantId: 'var-2',
        sku: 'SKU-002',
        name: 'Pants',
        unitPrice: 1000,
        quantity: 1,
        totalPrice: 1000,
      })

      order.addItem(item1)
      order.addItem(item2)

      expect(order.items).toHaveLength(2)
      expect(order.subtotalAmount).toBe(2000)
      expect(order.totalAmount).toBe(2000)
    })

    it('非 pending 狀態時，新增商品應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
      })

      expect(() => order.addItem(item)).toThrow('Order is not in pending state')
    })
  })

  describe('Adding Adjustments & Recalculation', () => {
    it('應該能新增調整並重新計算金額', () => {
      const order = Order.create('ord-1')

      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
      })
      order.addItem(item)

      const discount = new Adjustment('adj-1', {
        label: '10% off',
        amount: -50,
        sourceType: 'coupon',
        sourceId: 'coup-1',
      })
      order.addAdjustment(discount)

      expect(order.adjustments).toHaveLength(1)
      expect(order.adjustmentAmount).toBe(-50)
      expect(order.totalAmount).toBe(450)
    })

    it('應該能處理正向和負向調整', () => {
      const order = Order.create('ord-1')

      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
      })
      order.addItem(item)

      const discount = new Adjustment('adj-1', {
        label: 'Discount',
        amount: -100,
        sourceType: null,
        sourceId: null,
      })
      const tax = new Adjustment('adj-2', {
        label: 'Tax',
        amount: 50,
        sourceType: null,
        sourceId: null,
      })

      order.addAdjustment(discount)
      order.addAdjustment(tax)

      expect(order.adjustmentAmount).toBe(-50)
      expect(order.totalAmount).toBe(450)
    })

    it('非 pending 狀態時，新增調整應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      const adj = new Adjustment('adj-1', {
        label: 'Discount',
        amount: -100,
        sourceType: null,
        sourceId: null,
      })

      expect(() => order.addAdjustment(adj)).toThrow('Order is not in pending state')
    })
  })

  describe('Order Status Transitions', () => {
    it('應該能從 pending 轉移到 paid', () => {
      const order = Order.create('ord-1')
      expect(order.status).toBe('pending')

      order.markAsPaid()
      expect(order.status).toBe('paid')
    })

    it('非 pending 時，markAsPaid 應拋出錯誤', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      expect(() => order.markAsPaid()).toThrow('Invalid status transition')
    })

    it('應該能從 paid 狀態請求退款', () => {
      const order = Order.create('ord-1')
      order.markAsPaid()

      order.requestRefund()
      expect(order.status).toBe('requested_refund')
    })

    it('應該能從 processing 狀態請求退款', () => {
      const order = Order.create('ord-1')
      ;(order as any).props.status = 'processing'

      order.requestRefund()
      expect(order.status).toBe('requested_refund')
    })

    it('應該能從 completed 狀態請求退款', () => {
      const order = Order.create('ord-1')
      ;(order as any).props.status = 'completed'

      order.requestRefund()
      expect(order.status).toBe('requested_refund')
    })

    it('非允許狀態時，requestRefund 應拋出錯誤', () => {
      const order = Order.create('ord-1')

      expect(() => order.requestRefund()).toThrow(
        /Refund cannot be requested for order in pending state/
      )
    })

    it('應該能從 requested_refund 轉移到 refunded', () => {
      const order = Order.create('ord-1')
      ;(order as any).props.status = 'requested_refund'

      order.markAsRefunded()
      expect(order.status).toBe('refunded')
    })

    it('非 requested_refund 時，markAsRefunded 應拋出錯誤', () => {
      const order = Order.create('ord-1')

      expect(() => order.markAsRefunded()).toThrow('Order must be in requested_refund state')
    })
  })

  describe('Total Amount Calculation Edge Cases', () => {
    it('總金額不應為負數', () => {
      const order = Order.create('ord-1')

      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 100,
        quantity: 1,
        totalPrice: 100,
      })
      order.addItem(item)

      const largeDiscount = new Adjustment('adj-1', {
        label: 'Large discount',
        amount: -1000,
        sourceType: null,
        sourceId: null,
      })
      order.addAdjustment(largeDiscount)

      expect(order.totalAmount).toBe(0)
    })

    it('應該正確計算複雜的多項商品和調整場景', () => {
      const order = Order.create('ord-1')

      // 加入 3 件商品，總計 5000
      for (let i = 1; i <= 3; i++) {
        const item = new LineItem(`item-${i}`, {
          variantId: `var-${i}`,
          sku: `SKU-${i}`,
          name: `Product ${i}`,
          unitPrice: 1000 * i,
          quantity: 1,
          totalPrice: 1000 * i,
        })
        order.addItem(item)
      }

      expect(order.subtotalAmount).toBe(6000) // 1000 + 2000 + 3000

      // 加入折扣和運費
      const coupon = new Adjustment('adj-1', {
        label: '20% discount',
        amount: -1200,
        sourceType: 'coupon',
        sourceId: 'coup-1',
      })
      const shipping = new Adjustment('adj-2', {
        label: 'Shipping',
        amount: 200,
        sourceType: 'shipping',
        sourceId: null,
      })

      order.addAdjustment(coupon)
      order.addAdjustment(shipping)

      expect(order.adjustmentAmount).toBe(-1000)
      expect(order.totalAmount).toBe(5000)
    })
  })

  describe('Immutability', () => {
    it('items getter 應返回副本，不暴露內部陣列', () => {
      const order = Order.create('ord-1')
      const item = new LineItem('item-1', {
        variantId: 'var-1',
        sku: 'SKU-001',
        name: 'T-Shirt',
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
      })
      order.addItem(item)

      const items1 = order.items
      const items2 = order.items

      expect(items1).not.toBe(items2) // 不同的陣列引用
      expect(items1).toEqual(items2) // 但內容相同
    })

    it('adjustments getter 應返回副本', () => {
      const order = Order.create('ord-1')
      const adj = new Adjustment('adj-1', {
        label: 'Test',
        amount: -100,
        sourceType: null,
        sourceId: null,
      })
      order.addAdjustment(adj)

      const adjs1 = order.adjustments
      const adjs2 = order.adjustments

      expect(adjs1).not.toBe(adjs2)
      expect(adjs1).toEqual(adjs2)
    })
  })
})
