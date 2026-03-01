import { describe, expect, it } from 'bun:test'
import { injectCartOwner, injectMergeDonor, injectMergeReceiver } from '../src/Domain/DCI/Roles'
import { Cart } from '../src/Domain/Entities/Cart'
import { CartItem } from '../src/Domain/Entities/CartItem'
import { CartError } from '../src/Domain/Errors'

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

    it('CartOwner.addItem 應該新增商品到購物車', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-1')
      expect(cart.items[0].quantity).toBe(5)
    })

    it('CartOwner.addItem 應該累加相同變體的數量', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 2)
      owner.addItem('var-1', 3)

      expect(cart.items.length).toBe(1)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('CartOwner.removeItem 應該移除商品', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)
      owner.addItem('var-2', 3)
      expect(cart.items.length).toBe(2)

      owner.removeItem('var-1')
      expect(cart.items.length).toBe(1)
      expect(cart.items[0].variantId).toBe('var-2')
    })

    it('CartOwner.updateItemQuantity 應該更新數量', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)
      owner.updateItemQuantity('var-1', 10)

      expect(cart.items[0].quantity).toBe(10)
    })

    it('CartOwner.updateItemQuantity 應拋出錯誤如果項目不存在', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 5)

      expect(() => owner.updateItemQuantity('var-nonexistent', 10)).toThrow(CartError)
    })

    it('CartOwner.clear 應清空購物車', () => {
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
      const owner = injectCartOwner(cart)
      const donor = injectMergeDonor(cart)

      owner.addItem('var-1', 5)
      owner.addItem('var-2', 3)

      const items = donor.getItemsForMerge()
      expect(items.length).toBe(2)
      expect(items[0].variantId).toBe('var-1')
      expect(items[1].variantId).toBe('var-2')
    })

    it('MergeDonor.getItemsForMerge 應該回傳副本', () => {
      const cart = Cart.create('cart-1')
      const owner = injectCartOwner(cart)
      const donor = injectMergeDonor(cart)

      owner.addItem('var-1', 5)
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

    it('MergeReceiver.receiveItems 應該接收並新增商品', () => {
      const receiverCart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(receiverCart)

      const donorItems = [
        CartItem.create('item-1', 'var-1', 5),
        CartItem.create('item-2', 'var-2', 3),
      ]

      receiver.receiveItems(donorItems)

      expect(receiverCart.items.length).toBe(2)
      expect(receiverCart.items[0].variantId).toBe('var-1')
      expect(receiverCart.items[0].quantity).toBe(5)
    })

    it('MergeReceiver.receiveItems 應該累加相同變體', () => {
      const receiverCart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(receiverCart)
      const ownerReceiver = injectCartOwner(receiverCart)

      ownerReceiver.addItem('var-1', 2)

      const donorItems = [CartItem.create('item-1', 'var-1', 3)]
      receiver.receiveItems(donorItems)

      expect(receiverCart.items.length).toBe(1)
      expect(receiverCart.items[0].quantity).toBe(5)
    })

    it('MergeReceiver.receiveItems 應該混合新舊商品', () => {
      const receiverCart = Cart.create('cart-1')
      const receiver = injectMergeReceiver(receiverCart)
      const ownerReceiver = injectCartOwner(receiverCart)

      ownerReceiver.addItem('var-1', 2)
      ownerReceiver.addItem('var-3', 5)

      const donorItems = [
        CartItem.create('item-1', 'var-1', 3),
        CartItem.create('item-2', 'var-2', 1),
      ]
      receiver.receiveItems(donorItems)

      expect(receiverCart.items.length).toBe(3)
      const var1 = receiverCart.items.find((i) => i.variantId === 'var-1')
      expect(var1?.quantity).toBe(5)
      const var2 = receiverCart.items.find((i) => i.variantId === 'var-2')
      expect(var2?.quantity).toBe(1)
      const var3 = receiverCart.items.find((i) => i.variantId === 'var-3')
      expect(var3?.quantity).toBe(5)
    })
  })

  describe('DCI Coordination - Multiple Roles', () => {
    it('應該能協調 CartOwner 角色進行多個操作', () => {
      const cart = Cart.create('cart-1', 'mem-123')
      const owner = injectCartOwner(cart)

      owner.addItem('var-1', 2)
      owner.addItem('var-2', 1)
      owner.addItem('var-3', 5)
      expect(cart.items.length).toBe(3)

      owner.updateItemQuantity('var-2', 3)
      expect(cart.items.find((i) => i.variantId === 'var-2')?.quantity).toBe(3)

      owner.removeItem('var-1')
      expect(cart.items.length).toBe(2)

      owner.clear()
      expect(cart.items.length).toBe(0)
    })

    it('應該能協調 MergeDonor 與 MergeReceiver 完成合併', () => {
      const donorCart = Cart.create('donor-cart', null, 'guest-123')
      const receiverCart = Cart.create('receiver-cart', 'mem-456')

      const donorOwner = injectCartOwner(donorCart)
      const receiverOwner = injectCartOwner(receiverCart)

      // 設置 Donor 購物車
      donorOwner.addItem('var-1', 2)
      donorOwner.addItem('var-2', 1)

      // 設置 Receiver 購物車
      receiverOwner.addItem('var-1', 1)
      receiverOwner.addItem('var-3', 5)

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
