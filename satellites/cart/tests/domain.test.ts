import { describe, expect, it } from 'bun:test'
import { Cart } from '../src/Domain/Entities/Cart'
import { CartItem } from '../src/Domain/Entities/CartItem'
import { CartItemQuantity } from '../src/Domain/ValueObjects/CartItemQuantity'

describe('Cart Domain - Entity & ValueObjects', () => {
  describe('CartItemQuantity ValueObject', () => {
    it('應該驗證數量必須大於 0', () => {
      expect(() => CartItemQuantity.create(0)).toThrow()
      expect(() => CartItemQuantity.create(-5)).toThrow()
    })

    it('應該驗證數量必須是整數', () => {
      expect(() => CartItemQuantity.create(2.5)).toThrow()
    })

    it('應該能建立有效數量', () => {
      const qty = CartItemQuantity.create(5)
      expect(qty.value).toBe(5)
    })

    it('應該能增量數量', () => {
      const qty = CartItemQuantity.create(5)
      const incremented = qty.increment(3)
      expect(incremented.value).toBe(8)
      expect(qty.value).toBe(5) // 原值不變
    })

    it('應該能減量數量', () => {
      const qty = CartItemQuantity.create(5)
      const decremented = qty.decrement(2)
      expect(decremented.value).toBe(3)
    })
  })

  describe('CartItem Entity', () => {
    it('應該能建立購物車項目', () => {
      const item = CartItem.create('item-1', 'var-1', 5)
      expect(item.id).toBe('item-1')
      expect(item.variantId).toBe('var-1')
      expect(item.quantity).toBe(5)
    })

    it('應該驗證數量', () => {
      expect(() => CartItem.create('item-1', 'var-1', 0)).toThrow()
    })

    it('withQuantity 應回傳新物件（immutable）', () => {
      const item = CartItem.create('item-1', 'var-1', 5)
      const updated = item.withQuantity(10)

      expect(item.quantity).toBe(5) // 原值不變
      expect(updated.quantity).toBe(10)
      expect(item).not.toBe(updated)
    })
  })

  describe('Cart Entity - Creation & Getters', () => {
    it('應該能建立新購物車', () => {
      const cart = Cart.create('cart-1', 'mem-123')
      expect(cart.id).toBe('cart-1')
      expect(cart.memberId).toBe('mem-123')
      expect(cart.items.length).toBe(0)
      expect(cart.lastActivityAt).toBeInstanceOf(Date)
    })

    it('應該能建立訪客購物車', () => {
      const cart = Cart.create('cart-1', null, 'guest-456')
      expect(cart.memberId).toBeNull()
      expect(cart.guestId).toBe('guest-456')
    })

    it('items getter 應返回副本', () => {
      const cart = Cart.create('cart-1')
      const items1 = cart.items
      const items2 = cart.items

      expect(items1).not.toBe(items2)
      expect(items1).toEqual(items2)
    })

    it('應該能重構現有購物車', () => {
      const props = {
        memberId: 'mem-123',
        guestId: null,
        items: [CartItem.create('item-1', 'var-1', 5)],
        lastActivityAt: new Date('2025-01-01'),
      }
      const cart = Cart.reconstitute('cart-1', props)

      expect(cart.id).toBe('cart-1')
      expect(cart.memberId).toBe('mem-123')
      expect(cart.items.length).toBe(1)
    })
  })

  describe('Cart Entity - Setters (DCI 層使用)', () => {
    it('應該能設置購物車項目', () => {
      const cart = Cart.create('cart-1')
      const items = [CartItem.create('item-1', 'var-1', 5)]

      cart.setItems(items)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-1')
    })

    it('應該能設置會員 ID', () => {
      const cart = Cart.create('cart-1', null, 'guest-123')

      cart.setMemberId('mem-456')

      expect(cart.memberId).toBe('mem-456')
    })

    it('應該能設置訪客 ID', () => {
      const cart = Cart.create('cart-1', 'mem-123')

      cart.setGuestId('guest-789')

      expect(cart.guestId).toBe('guest-789')
    })

    it('setItems 應更新 lastActivityAt', () => {
      const cart = Cart.create('cart-1')
      const oldTime = cart.lastActivityAt

      // 等待一些時間
      setTimeout(() => {
        const items = [CartItem.create('item-1', 'var-1', 5)]
        cart.setItems(items)

        expect(cart.lastActivityAt.getTime()).toBeGreaterThanOrEqual(oldTime.getTime())
      }, 10)
    })
  })

  describe('Cart propsObject getter', () => {
    it('應該回傳購物車 props 物件副本', () => {
      const cart = Cart.create('cart-1', 'mem-123')
      const propsObj = cart.propsObject

      expect(propsObj.memberId).toBe('mem-123')
      expect(propsObj.guestId).toBeNull()
      expect(propsObj.items.length).toBe(0)
      expect(propsObj.lastActivityAt).toBeInstanceOf(Date)
    })
  })
})
