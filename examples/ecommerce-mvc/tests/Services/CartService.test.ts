import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventManager } from '@gravito/core'
import { Cart, CartItem } from '../../src/models'
import { CartRepository } from '../../src/Repositories'
import { CartService } from '../../src/Services'

describe('CartService', () => {
  let service: CartService
  let repository: CartRepository
  let eventManager: EventManager & { dispatchCalls: any[] }

  beforeEach(() => {
    repository = new CartRepository()

    // Mock EventManager
    eventManager = {
      dispatchCalls: [],
      dispatch: async (event: any) => {
        eventManager.dispatchCalls.push(event)
      },
    } as any
  })

  describe('getOrCreateCart', () => {
    it('should return raw cart model from repository', async () => {
      service = new CartService(repository)

      // Mock repository method
      const mockCart = new Cart()
      mockCart.id = 1
      mockCart.user_id = 1
      mockCart.items = []

      repository.getOrCreate = async () => mockCart

      const cart = await service.getOrCreateCart(1)

      expect(cart.id).toBe(1)
      expect(cart.items).toEqual([])
    })
  })

  describe('addItem', () => {
    it('should add item and dispatch CartItemAdded event', async () => {
      service = new CartService(repository, eventManager)

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

      await service.addItem(1, 1, 2)

      expect(eventManager.dispatchCalls).toHaveLength(1)
      expect(eventManager.dispatchCalls[0].constructor.name).toBe('CartItemAdded')
    })

    it('should not dispatch event if EventManager not provided', async () => {
      service = new CartService(repository)

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

      const item = await service.addItem(1, 1, 2)

      expect(item.id).toBe(1)
      // No event dispatched, but service still works
    })
  })

  describe('clearCart', () => {
    it('should clear cart and dispatch CartCleared event', async () => {
      service = new CartService(repository, eventManager)

      repository.clearCart = async () => {}

      await service.clearCart(1)

      expect(eventManager.dispatchCalls).toHaveLength(1)
      expect(eventManager.dispatchCalls[0].constructor.name).toBe('CartCleared')
    })
  })

  describe('addItemAsDTO', () => {
    it('should return CartItemResponseDTO', async () => {
      service = new CartService(repository, eventManager)

      const mockItem = new CartItem()
      mockItem.id = 1
      mockItem.cart_id = 1
      mockItem.product_id = 1
      mockItem.quantity = 2
      mockItem.price = 5000
      mockItem.created_at = new Date('2024-01-01T00:00:00Z')
      mockItem.product = {
        id: 1,
        name: 'Test Product',
        slug: 'test-product',
        image_url: 'https://example.com/product.jpg',
        stock: 100,
      }

      repository.addItem = async () => mockItem

      const dto = await service.addItemAsDTO(1, 1, 2)

      expect(dto.productId).toBe(1)
      expect(dto.quantity).toBe(2)
      expect(dto.lineTotal).toBe(10000)
      expect(dto.product.name).toBe('Test Product')
    })
  })

  describe('getUserCartAsDTO', () => {
    it('should return CartResponseDTO for user', async () => {
      service = new CartService(repository, eventManager)

      const mockCart = new Cart()
      mockCart.id = 1
      mockCart.user_id = 1
      mockCart.created_at = new Date('2024-01-01T00:00:00Z')
      mockCart.updated_at = new Date('2024-01-01T00:00:00Z')

      const mockItem = new CartItem()
      mockItem.id = 1
      mockItem.cart_id = 1
      mockItem.product_id = 1
      mockItem.quantity = 2
      mockItem.price = 5000
      mockItem.created_at = new Date('2024-01-01T00:00:00Z')
      mockItem.product = {
        id: 1,
        name: 'Test Product',
        slug: 'test-product',
        image_url: null,
        stock: 100,
      }

      mockCart.items = [mockItem]

      repository.getOrCreateForUser = async () => mockCart
      repository.getWithItems = async () => {
        mockCart.items = [mockItem]
        return mockCart
      }

      const dto = await service.getUserCartAsDTO(1)

      expect(dto.userId).toBe(1)
      expect(dto.itemCount).toBe(2)
      expect(dto.subtotal).toBe(10000)
      expect(dto.items).toHaveLength(1)
    })
  })
})
