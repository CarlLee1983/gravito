import { describe, expect, it } from 'bun:test'
import { Cart, CartItem } from '../src/Domain/Entities/Cart'

describe('Cart Domain - Cart & CartItem', () => {
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

    it('應該能建立成員和訪客都有的購物車', () => {
      const cart = Cart.create('cart-1', 'mem-123', 'guest-456')

      expect(cart.memberId).toBe('mem-123')
      expect(cart.guestId).toBe('guest-456')
    })
  })

  describe('Adding Items', () => {
    it('應該能新增商品到購物車', () => {
      const cart = Cart.create('cart-1')

      cart.addItem('var-1', 2)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].props.variantId).toBe('var-1')
      expect(cart.items[0].props.quantity).toBe(2)
    })

    it('應該累加相同變體的數量', () => {
      const cart = Cart.create('cart-1')

      cart.addItem('var-1', 2)
      cart.addItem('var-1', 3)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].props.quantity).toBe(5)
    })

    it('應該能新增多個不同的變體', () => {
      const cart = Cart.create('cart-1')

      cart.addItem('var-1', 2)
      cart.addItem('var-2', 1)
      cart.addItem('var-3', 5)

      expect(cart.items.length).toBe(3)
    })

    it('應該更新 lastActivityAt', () => {
      const cart = Cart.create('cart-1')
      const before = cart.lastActivityAt

      cart.addItem('var-1', 1)

      expect(cart.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
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
      // var-1 應該合併為 5
      const var1Item = cart1.items.find((i) => i.props.variantId === 'var-1')
      expect(var1Item?.props.quantity).toBe(5)
    })

    it('合併空購物車應該沒有變化', () => {
      const cart1 = Cart.create('cart-1')
      const cart2 = Cart.create('cart-2')

      cart1.addItem('var-1', 2)
      const itemsCountBefore = cart1.items.length

      cart1.merge(cart2)

      expect(cart1.items.length).toBe(itemsCountBefore)
    })

    it('合併應更新 lastActivityAt', () => {
      const cart1 = Cart.create('cart-1')
      const cart2 = Cart.create('cart-2')

      cart1.addItem('var-1', 1)
      const before = cart1.lastActivityAt

      cart2.addItem('var-2', 1)
      cart1.merge(cart2)

      expect(cart1.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('CartItem', () => {
    it('應該能建立購物車項目', () => {
      const item = new CartItem('item-1', {
        variantId: 'var-1',
        quantity: 5,
      })

      expect(item.id).toBe('item-1')
      expect(item.props.variantId).toBe('var-1')
      expect(item.props.quantity).toBe(5)
    })

    it('應該能增加數量', () => {
      const item = new CartItem('item-1', {
        variantId: 'var-1',
        quantity: 2,
      })

      item.addQuantity(3)
      expect(item.props.quantity).toBe(5)
    })

    it('應該能減少數量（負數）', () => {
      const item = new CartItem('item-1', {
        variantId: 'var-1',
        quantity: 5,
      })

      item.addQuantity(-2)
      expect(item.props.quantity).toBe(3)
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

      expect(cart.items[0].props.quantity).toBe(999999)
    })

    it('應該能處理多次累加', () => {
      const cart = Cart.create('cart-1')

      for (let i = 0; i < 100; i++) {
        cart.addItem('var-1', 1)
      }

      expect(cart.items[0].props.quantity).toBe(100)
    })

    it('應該能處理許多不同變體', () => {
      const cart = Cart.create('cart-1')

      for (let i = 0; i < 100; i++) {
        cart.addItem(`var-${i}`, 1)
      }

      expect(cart.items.length).toBe(100)
    })
  })
})
