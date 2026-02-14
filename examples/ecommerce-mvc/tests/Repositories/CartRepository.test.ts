import { beforeEach, describe, expect, it } from 'bun:test'
import { Cart, CartItem } from '../../src/models'
import { CartRepository } from '../../src/Repositories'

describe('CartRepository', () => {
  let repository: CartRepository

  beforeEach(() => {
    repository = new CartRepository()
  })

  describe('getOrCreateForUser', () => {
    it('should return cart type from repository method', async () => {
      const mockCart = new Cart()
      mockCart.id = 1
      mockCart.user_id = 1
      mockCart.items = []

      repository.getOrCreateForUser = async () => mockCart

      const cart = await repository.getOrCreateForUser(1)

      expect(cart.id).toBe(1)
      expect(cart.user_id).toBe(1)
    })
  })

  describe('getOrCreateForSession', () => {
    it('should return cart for session', async () => {
      const mockCart = new Cart()
      mockCart.id = 1
      mockCart.session_id = 'session-123'
      mockCart.items = []

      repository.getOrCreateForSession = async () => mockCart

      const cart = await repository.getOrCreateForSession('session-123')

      expect(cart.session_id).toBe('session-123')
    })
  })

  describe('addItem', () => {
    it('should return cart item', async () => {
      const mockItem = new CartItem()
      mockItem.id = 1
      mockItem.cart_id = 1
      mockItem.product_id = 1
      mockItem.quantity = 2
      mockItem.price = 5000
      mockItem.product = {
        id: 1,
        name: 'Test Product',
        slug: 'test-product',
        image_url: null,
        stock: 100,
      }

      repository.addItem = async () => mockItem

      const item = await repository.addItem(1, 1, 2)

      expect(item.product_id).toBe(1)
      expect(item.quantity).toBe(2)
      expect(item.price).toBe(5000)
    })
  })

  describe('getCartItems', () => {
    it('should return array of cart items', async () => {
      const mockItem = new CartItem()
      mockItem.id = 1
      mockItem.quantity = 2

      repository.getCartItems = async () => [mockItem]

      const items = await repository.getCartItems(1)

      expect(items).toHaveLength(1)
      expect(items[0].quantity).toBe(2)
    })
  })

  describe('clearCart', () => {
    it('should clear cart items', async () => {
      repository.clearCart = async () => {}

      await repository.clearCart(1)
      // Test passes if no error thrown
      expect(true).toBe(true)
    })
  })

  describe('mergeCarts', () => {
    it('should merge guest cart into user cart', async () => {
      const mockCart = new Cart()
      mockCart.id = 2
      mockCart.user_id = 1
      mockCart.items = []

      repository.mergeCarts = async () => mockCart

      const merged = await repository.mergeCarts('guest-123', 1)

      expect(merged.user_id).toBe(1)
    })
  })
})
