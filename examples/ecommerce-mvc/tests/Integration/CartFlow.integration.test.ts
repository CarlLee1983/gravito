import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import { CartRepository } from '../../src/Repositories'
import { CartService } from '../../src/Services'
import { cleanupAllTables, createCartTables, createProductTables, setupTestDatabase } from './setup'

describe('Cart Integration - Full Workflow', () => {
  let service: CartService
  let repository: CartRepository

  beforeAll(async () => {
    await setupTestDatabase()
    await createCartTables()
    await createProductTables()
  })

  beforeEach(async () => {
    repository = new CartRepository()
    service = new CartService(repository)

    // Insert test products
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Laptop', 'laptop', 'https://example.com/laptop.jpg', 50, 150000, 1]
    )
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Mouse', 'mouse', 'https://example.com/mouse.jpg', 200, 3000, 1]
    )
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Keyboard', 'keyboard', 'https://example.com/keyboard.jpg', 100, 8000, 1]
    )
  })

  afterEach(async () => {
    // Clean up between tests
    await cleanupAllTables()
  })

  describe('User Cart Creation & Shopping', () => {
    it('should create cart for user and add products', async () => {
      // Step 1: Create cart for user
      const cart = await service.getOrCreateCart(1)
      expect(cart.id).toBeGreaterThan(0)
      expect(cart.user_id).toBe(1)

      // Step 2: Add first product (Laptop)
      const item1 = await service.addItem(cart.id, 1, 1)
      expect(item1.quantity).toBe(1)
      expect(item1.price).toBe(150000)

      // Step 3: Add second product (Mouse)
      const item2 = await service.addItem(cart.id, 2, 2)
      expect(item2.quantity).toBe(2)
      expect(item2.price).toBe(3000)

      // Step 4: Verify cart contents
      const items = await service.getCartItems(cart.id)
      expect(items).toHaveLength(2)

      // Verify cart totals
      const updatedCart = await repository.getWithItems(cart.id)
      expect(updatedCart?.getItemCount()).toBe(3) // 1 laptop + 2 mice
      expect(updatedCart?.getSubtotal()).toBe(150000 + 6000) // laptop + (2 × mouse)
    })

    it('should update quantity when adding same product again', async () => {
      // Step 1: Create cart
      const cart = await service.getOrCreateCart(2)

      // Step 2: Add product
      await service.addItem(cart.id, 1, 1)

      // Step 3: Add same product again
      const updatedItem = await service.addItem(cart.id, 1, 2)
      expect(updatedItem.quantity).toBe(3) // 1 + 2

      // Step 4: Verify only one cart item exists
      const items = await service.getCartItems(cart.id)
      expect(items).toHaveLength(1)
      expect(items[0].quantity).toBe(3)
    })

    it('should handle item quantity update', async () => {
      // Step 1: Create cart and add product
      const cart = await service.getOrCreateCart(3)
      const item = await service.addItem(cart.id, 2, 1)

      // Step 2: Update quantity
      await service.updateItemQuantity(item.id, 5)

      // Step 3: Verify update
      const items = await service.getCartItems(cart.id)
      expect(items[0].quantity).toBe(5)
    })

    it('should remove item from cart', async () => {
      // Step 1: Create cart with two products
      const cart = await service.getOrCreateCart(4)
      const item1 = await service.addItem(cart.id, 1, 1)
      await service.addItem(cart.id, 2, 1)

      expect((await service.getCartItems(cart.id)).length).toBe(2)

      // Step 2: Remove first item
      await service.removeItem(item1.id)

      // Step 3: Verify removal
      const items = await service.getCartItems(cart.id)
      expect(items).toHaveLength(1)
      expect(items[0].product_id).toBe(2)
    })

    it('should clear entire cart', async () => {
      // Step 1: Create cart with products
      const cart = await service.getOrCreateCart(5)
      await service.addItem(cart.id, 1, 1)
      await service.addItem(cart.id, 2, 1)
      await service.addItem(cart.id, 3, 1)

      expect((await service.getCartItems(cart.id)).length).toBe(3)

      // Step 2: Clear cart
      await service.clearCart(cart.id)

      // Step 3: Verify cart is empty
      const items = await service.getCartItems(cart.id)
      expect(items).toHaveLength(0)
    })
  })

  describe('Guest to User Cart Merge', () => {
    it('should merge guest cart with user cart on login', async () => {
      // Step 1: Guest shops (no account)
      const guestCart = await service.getOrCreateCart(undefined, 'guest-session-123')
      await service.addItem(guestCart.id, 1, 1) // Guest adds laptop
      await service.addItem(guestCart.id, 2, 1) // Guest adds mouse

      expect((await service.getCartItems(guestCart.id)).length).toBe(2)

      // Step 2: User already has items in their cart
      const userCart = await service.getOrCreateCart(10)
      await service.addItem(userCart.id, 3, 2) // User already has keyboard

      expect((await service.getCartItems(userCart.id)).length).toBe(1)

      // Step 3: User logs in - merge guest cart with user cart
      const mergedCart = await service.mergeCarts('guest-session-123', 10)

      // Step 4: Verify merge
      expect(mergedCart.id).toBe(userCart.id)
      const finalItems = await service.getCartItems(mergedCart.id)
      expect(finalItems).toHaveLength(3) // Laptop, Mouse, Keyboard
    })

    it('should handle merge when guest cart doesnt exist', async () => {
      // Create user cart
      const userCart = await service.getOrCreateCart(20)
      await service.addItem(userCart.id, 1, 1)

      // Merge with non-existent guest cart
      const result = await service.mergeCarts('non-existent-session', 20)

      // Should return user cart unchanged
      expect(result.id).toBe(userCart.id)
      const items = await service.getCartItems(result.id)
      expect(items).toHaveLength(1)
    })
  })

  describe('Cart DTO Presentation', () => {
    it('should return properly formatted CartResponseDTO', async () => {
      // Step 1: Create cart with products
      const cart = await service.getOrCreateCart(30)
      await service.addItem(cart.id, 1, 1)
      await service.addItem(cart.id, 2, 3)

      // Step 2: Get DTO
      const dto = await service.getCartAsDTO(cart.id)

      // Step 3: Verify DTO structure
      expect(dto).toBeDefined()
      expect(dto?.userId).toBe(30)
      expect(dto?.itemCount).toBe(4) // 1 + 3
      expect(dto?.subtotal).toBe(150000 + 9000) // (1 × 150000) + (3 × 3000)
      expect(dto?.items).toHaveLength(2)

      // Verify nested item DTOs
      expect(dto?.items[0].productId).toBe(1)
      expect(dto?.items[0].product.name).toBe('Laptop')
      expect(dto?.items[0].lineTotal).toBe(150000) // 1 × 150000

      expect(dto?.items[1].productId).toBe(2)
      expect(dto?.items[1].product.name).toBe('Mouse')
      expect(dto?.items[1].lineTotal).toBe(9000) // 3 × 3000
    })

    it('should return null for non-existent cart', async () => {
      const dto = await service.getCartAsDTO(99999)
      expect(dto).toBeNull()
    })
  })

  describe('Stock Validation', () => {
    it('should reject adding product with insufficient stock', async () => {
      const cart = await service.getOrCreateCart(40)

      // Try to add more than available stock (laptop has 50)
      expect(service.addItem(cart.id, 1, 100)).rejects.toThrow('Insufficient stock')
    })

    it('should reject quantity update exceeding stock', async () => {
      const cart = await service.getOrCreateCart(41)
      const item = await service.addItem(cart.id, 1, 10)

      // Try to update quantity beyond available stock
      expect(service.updateItemQuantity(item.id, 100)).rejects.toThrow('Insufficient stock')
    })
  })
})
