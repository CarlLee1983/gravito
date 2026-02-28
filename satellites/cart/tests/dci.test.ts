import { beforeEach, describe, expect, it } from 'bun:test'
import { injectCartOwner, injectMergeDonor, injectMergeReceiver } from '../src/Domain/DCI/Roles'
import { Cart } from '../src/Domain/Entities/Cart'

describe('DCI - Roles & Contexts', () => {
  describe('CartOwnerRole', () => {
    it('應該能注入 CartOwner 角色', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      expect(owner).toBeDefined()
      expect(typeof owner.addItem).toBe('function')
      expect(typeof owner.removeItem).toBe('function')
      expect(typeof owner.updateItemQuantity).toBe('function')
      expect(typeof owner.clear).toBe('function')
    })

    it('CartOwner.addItem 應該委派到 Cart.addItem', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-1')
      expect(cart.items[0].quantity).toBe(5)
    })

    it('CartOwner.removeItem 應該委派到 Cart.removeItem', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)
      owner.addItem('var-2', 3)
      expect(cart.items.length).toBe(2)

      owner.removeItem('var-1')
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-2')
    })

    it('CartOwner.updateItemQuantity 應該委派到 Cart.updateItemQuantity', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)
      owner.updateItemQuantity('var-1', 10)

      expect(cart.items[0].quantity).toBe(10)
    })

    it('CartOwner.clear 應該委派到 Cart.clear', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)
      owner.addItem('var-2', 3)
      expect(cart.items.length).toBe(2)

      owner.clear()
      expect(cart.items.length).toBe(0)
    })
  })

  describe('MergeDonorRole', () => {
    it('應該能注入 MergeDonor 角色', () => {
      const cart = Cart.create('cart-1')
      const donor = injectMergeDonor(cart)

      expect(donor).toBeDefined()
      expect(typeof donor.getItemsForMerge).toBe('function')
    })

    it('MergeDonor.getItemsForMerge 應該回傳購物車項目', () => {
      const cart = Cart.create('cart-1')
      const donor = injectMergeDonor(cart)

      cart.addItem('var-1', 5)
      cart.addItem('var-2', 3)

      const items = donor.getItemsForMerge()
      expect(items.length).toBe(2)
      expect(items[0].variantId).toBe('var-1')
      expect(items[1].variantId).toBe('var-2')
    })

    it('MergeDonor.getItemsForMerge 應該回傳副本', () => {
      const cart = Cart.create('cart-1')
      const donor = injectMergeDonor(cart)

      cart.addItem('var-1', 5)
      const items1 = donor.getItemsForMerge()
      const items2 = donor.getItemsForMerge()

      expect(items1).not.toBe(items2)
      expect(items1).toEqual(items2)
    })
  })

  describe('MergeReceiverRole', () => {
    it('應該能注入 MergeReceiver 角色', () => {
      const cart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(cart)

      expect(receiver).toBeDefined()
      expect(typeof receiver.receiveItems).toBe('function')
    })

    it('MergeReceiver.receiveItems 應該委派到 Cart.addItem', () => {
      const receiverCart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(receiverCart)

      const donorCart = Cart.create('cart-2')
      donorCart.addItem('var-1', 5)
      donorCart.addItem('var-2', 3)

      const itemsToMerge = donorCart.items
      receiver.receiveItems(itemsToMerge)

      expect(receiverCart.items.length).toBe(2)
      expect(receiverCart.items[0].variantId).toBe('var-1')
      expect(receiverCart.items[0].quantity).toBe(5)
    })

    it('MergeReceiver.receiveItems 應該累加相同變體', () => {
      const receiverCart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(receiverCart)

      receiverCart.addItem('var-1', 2)

      const donorCart = Cart.create('cart-2')
      donorCart.addItem('var-1', 3)

      receiver.receiveItems(donorCart.items)

      expect(receiverCart.items.length).toBe(1)
      expect(receiverCart.items[0].quantity).toBe(5)
    })
  })

  describe('DCI Coordination Example', () => {
    it('應該能協調 MergeDonor 與 MergeReceiver 完成合併', () => {
      const donorCart = Cart.create('donor-cart', null, 'guest-123')
      const receiverCart = Cart.create('receiver-cart', 'mem-456')

      donorCart.addItem('var-1', 2)
      donorCart.addItem('var-2', 1)

      receiverCart.addItem('var-1', 1)
      receiverCart.addItem('var-3', 5)

      // 協調
      const donor = injectMergeDonor(donorCart)
      const receiver = injectMergeReceiver(receiverCart)
      const itemsToMerge = donor.getItemsForMerge()
      receiver.receiveItems(itemsToMerge)

      // 驗證
      expect(receiverCart.items.length).toBe(3)
      const var1 = receiverCart.items.find((i) => i.variantId === 'var-1')
      expect(var1?.quantity).toBe(3) // 1 + 2
      const var2 = receiverCart.items.find((i) => i.variantId === 'var-2')
      expect(var2?.quantity).toBe(1)
      const var3 = receiverCart.items.find((i) => i.variantId === 'var-3')
      expect(var3?.quantity).toBe(5)
    })
  })
})
