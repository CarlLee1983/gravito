import { describe, expect, it } from 'bun:test'
import { Cart } from '../src/Domain/Entities/Cart'
import { CartItem } from '../src/Domain/Entities/CartItem'
import { CartItemQuantity } from '../src/Domain/ValueObjects/CartItemQuantity'

describe('Cart Domain - Cart, CartItem & ValueObjects', () => {
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

  describe('Cart Creation', () => {
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
  })

  describe('Adding Items', () => {
    it('應該能新增商品到購物車', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-1')
      expect(cart.items[0].quantity).toBe(2)
    })

    it('應該累加相同變體的數量', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)
      cart.addItem('var-1', 3)
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('應該能新增多個不同的變體', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)
      cart.addItem('var-2', 1)
      cart.addItem('var-3', 5)
      expect(cart.items.length).toBe(3)
    })
  })

  describe('Removing Items', () => {
    it('應該能移除購物車項目', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)
      cart.addItem('var-2', 1)
      expect(cart.items.length).toBe(2)

      cart.removeItem('var-1')
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-2')
    })

    it('移除不存在的項目應該無效', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)

      cart.removeItem('var-nonexistent')
      expect(cart.items.length).toBe(1)
    })
  })

  describe('Updating Item Quantity', () => {
    it('應該能更新項目數量', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)

      cart.updateItemQuantity('var-1', 5)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('更新不存在的項目應該無效', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)

      cart.updateItemQuantity('var-nonexistent', 10)
      expect(cart.items.length).toBe(1)
    })

    it('應該驗證新數量', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)

      expect(() => cart.updateItemQuantity('var-1', 0)).toThrow()
    })
  })

  describe('Clear Cart', () => {
    it('應該清空購物車所有項目', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)
      cart.addItem('var-2', 1)
      expect(cart.items.length).toBe(2)

      cart.clear()
      expect(cart.items.length).toBe(0)
    })

    it('清空空購物車應該安全', () => {
      const cart = Cart.create('cart-1')
      cart.clear()
      expect(cart.items.length).toBe(0)
    })
  })

  describe('Reassign to Member', () => {
    it('應該能將訪客購物車轉正為會員購物車', () => {
      const cart = Cart.create('cart-1', null, 'guest-123')
      expect(cart.memberId).toBeNull()
      expect(cart.guestId).toBe('guest-123')

      cart.reassignToMember('mem-456')
      expect(cart.memberId).toBe('mem-456')
      expect(cart.guestId).toBeNull()
    })
  })

  describe('Merging Carts', () => {
    it('應該能合併兩個購物車', () => {
      const cart1 = Cart.create('cart-1')
      const cart2 = Cart.create('cart-2')
      cart1.addItem('var-1', 2)
      cart2.addItem('var-2', 3)

      cart1.merge(cart2)
      expect(cart1.items.length).toBe(2)
    })

    it('合併時應累加相同變體的數量', () => {
      const cart1 = Cart.create('cart-1')
      const cart2 = Cart.create('cart-2')
      cart1.addItem('var-1', 2)
      cart2.addItem('var-1', 3)
      cart2.addItem('var-2', 1)

      cart1.merge(cart2)
      expect(cart1.items.length).toBe(2)
      const var1Item = cart1.items.find((i) => i.variantId === 'var-1')
      expect(var1Item?.quantity).toBe(5)
    })
  })

  describe('Immutability', () => {
    it('items getter 應返回副本', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 2)

      const items1 = cart.items
      const items2 = cart.items

      expect(items1).not.toBe(items2)
      expect(items1).toEqual(items2)
    })
  })

  describe('Edge Cases', () => {
    it('應該能處理大數量', () => {
      const cart = Cart.create('cart-1')
      cart.addItem('var-1', 999999)
      expect(cart.items[0].quantity).toBe(999999)
    })

    it('應該能處理多次累加', () => {
      const cart = Cart.create('cart-1')
      for (let i = 0; i < 100; i++) {
        cart.addItem('var-1', 1)
      }
      expect(cart.items[0].quantity).toBe(100)
    })
  })
})
