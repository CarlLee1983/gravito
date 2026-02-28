import { describe, expect, it } from 'bun:test'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

describe('OrderItem', () => {
  const unitPrice = Money.of(100)

  describe('create (靜態工廠方法)', () => {
    it('應正確建立 OrderItem', () => {
      const item = OrderItem.create('prod-1', 'Test Product', 3, unitPrice)

      expect(item.productId).toBe('prod-1')
      expect(item.productName).toBe('Test Product')
      expect(item.quantity).toBe(3)
      expect(item.unitPrice.value).toBe(100)
    })

    it('應自動計算 totalPrice', () => {
      const item = OrderItem.create('prod-1', 'Test Product', 3, unitPrice)

      expect(item.totalPrice.value).toBe(300) // 100 * 3
    })

    it('應以單件數量正確計算 totalPrice', () => {
      const item = OrderItem.create('prod-1', 'Test Product', 1, unitPrice)

      expect(item.totalPrice.value).toBe(100)
    })

    it('應以小數單價正確計算 totalPrice', () => {
      const price = Money.of(33.33)
      const item = OrderItem.create('prod-1', 'Test Product', 3, price)

      expect(item.totalPrice.value).toBeCloseTo(99.99, 2)
    })

    it('應拒絕零數量', () => {
      expect(() => OrderItem.create('prod-1', 'Test', 0, unitPrice)).toThrow()
    })

    it('應拒絕負數量', () => {
      expect(() => OrderItem.create('prod-1', 'Test', -1, unitPrice)).toThrow()
    })

    it('應拒絕空的 productId', () => {
      expect(() => OrderItem.create('', 'Test', 1, unitPrice)).toThrow()
    })

    it('應拒絕空的 productName', () => {
      expect(() => OrderItem.create('prod-1', '', 1, unitPrice)).toThrow()
    })
  })

  describe('equals (ValueObject)', () => {
    it('相同屬性應相等', () => {
      const a = OrderItem.create('prod-1', 'Test', 2, unitPrice)
      const b = OrderItem.create('prod-1', 'Test', 2, unitPrice)

      expect(a.equals(b)).toBe(true)
    })

    it('不同屬性應不相等', () => {
      const a = OrderItem.create('prod-1', 'Test', 2, unitPrice)
      const b = OrderItem.create('prod-2', 'Test', 2, unitPrice)

      expect(a.equals(b)).toBe(false)
    })
  })
})
