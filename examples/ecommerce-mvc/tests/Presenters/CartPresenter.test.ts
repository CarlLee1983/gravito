import { describe, expect, it } from 'bun:test'
import { Cart, CartItem } from '../../src/models'
import { CartPresenter } from '../../src/Presenters'

describe('CartPresenter', () => {
  describe('present', () => {
    it('should transform cart model to DTO', () => {
      // Setup
      const cart = new Cart()
      cart.id = 1
      cart.user_id = 1
      cart.created_at = new Date('2024-01-01T00:00:00Z')
      cart.updated_at = new Date('2024-01-02T00:00:00Z')

      const item = new CartItem()
      item.id = 1
      item.cart_id = 1
      item.product_id = 1
      item.quantity = 2
      item.price = 5000
      item.created_at = new Date('2024-01-01T00:00:00Z')
      item.product = {
        id: 1,
        name: 'Test Product',
        slug: 'test-product',
        image_url: 'https://example.com/product.jpg',
        stock: 100,
      }

      cart.items = [item]

      // Test
      const dto = CartPresenter.present(cart)

      expect(dto.id).toBe(1)
      expect(dto.userId).toBe(1)
      expect(dto.itemCount).toBe(2)
      expect(dto.subtotal).toBe(10000)
      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z')
      expect(dto.items).toHaveLength(1)
    })

    it('should handle empty cart', () => {
      // Setup
      const cart = new Cart()
      cart.id = 1
      cart.user_id = 1
      cart.created_at = new Date('2024-01-01T00:00:00Z')
      cart.updated_at = new Date('2024-01-01T00:00:00Z')
      cart.items = []

      // Test
      const dto = CartPresenter.present(cart)

      expect(dto.itemCount).toBe(0)
      expect(dto.subtotal).toBe(0)
      expect(dto.items).toHaveLength(0)
    })

    it('should use camelCase for properties', () => {
      // Setup
      const cart = new Cart()
      cart.id = 1
      cart.user_id = 1
      cart.session_id = 'session-123'
      cart.created_at = new Date()
      cart.updated_at = new Date()
      cart.items = []

      // Test
      const dto = CartPresenter.present(cart)

      expect(dto.userId).toBeDefined()
      expect(Object.keys(dto)).toContain('userId')
      expect(Object.keys(dto)).not.toContain('user_id')
      expect(Object.keys(dto)).toContain('createdAt')
      expect(Object.keys(dto)).not.toContain('created_at')
    })
  })
})
