import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import type { EventManager } from '@gravito/core'
import {
  CartCleared,
  CartItemAdded,
  OrderCancelled,
  OrderCreated,
  OrderPaid,
} from '../../src/Events'
import type { CreateOrderInput } from '../../src/Repositories'
import { CartRepository, OrderRepository } from '../../src/Repositories'
import { CartService, OrderService } from '../../src/Services'
import {
  cleanupAllTables,
  createCartTables,
  createOrderTables,
  createProductTables,
  setupTestDatabase,
} from './setup'

describe('Event Dispatch Integration', () => {
  let cartService: CartService
  let orderService: OrderService
  let cartRepository: CartRepository
  let orderRepository: OrderRepository
  let eventManager: EventManager & { dispatchedEvents: any[] }

  const shippingAddress = {
    name: 'John Doe',
    phone: '0912345678',
    address: '123 Main Street',
    city: 'Taipei',
    postal_code: '100',
  }

  beforeAll(async () => {
    await setupTestDatabase()
    await createCartTables()
    await createProductTables()
    await createOrderTables()
  })

  beforeEach(async () => {
    // Create event manager with dispatch tracking
    eventManager = {
      dispatchedEvents: [],
      dispatch: async (event: any) => {
        eventManager.dispatchedEvents.push(event)
      },
    } as any

    cartRepository = new CartRepository()
    orderRepository = new OrderRepository()
    cartService = new CartService(cartRepository, eventManager)
    orderService = new OrderService(orderRepository, eventManager)

    // Insert test product
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Laptop', 'laptop', 'https://example.com/laptop.jpg', 50, 150000, 1]
    )
  })

  afterEach(async () => {
    await cleanupAllTables()
  })

  describe('Cart Events', () => {
    it('should dispatch CartItemAdded event when adding item', async () => {
      const cart = await cartService.getOrCreateCart(1)

      eventManager.dispatchedEvents = [] // Reset

      await cartService.addItem(cart.id, 1, 2)

      // Verify event was dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('CartItemAdded')
      expect(eventManager.dispatchedEvents[0].cartId).toBe(cart.id)
      expect(eventManager.dispatchedEvents[0].productId).toBe(1)
    })

    it('should dispatch CartCleared event when clearing cart', async () => {
      const cart = await cartService.getOrCreateCart(2)
      await cartService.addItem(cart.id, 1, 2)

      eventManager.dispatchedEvents = [] // Reset

      await cartService.clearCart(cart.id)

      // Verify event was dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('CartCleared')
      expect(eventManager.dispatchedEvents[0].cartId).toBe(cart.id)
    })

    it('should dispatch multiple events on multiple operations', async () => {
      const cart = await cartService.getOrCreateCart(3)

      eventManager.dispatchedEvents = [] // Reset

      // Add two items
      await cartService.addItem(cart.id, 1, 1)
      await cartService.addItem(cart.id, 1, 2) // Same product again

      // Verify two events dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(2)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('CartItemAdded')
      expect(eventManager.dispatchedEvents[1].constructor.name).toBe('CartItemAdded')
    })
  })

  describe('Order Events', () => {
    it('should dispatch OrderCreated event when creating order', async () => {
      const cart = await cartService.getOrCreateCart(4)
      await cartService.addItem(cart.id, 1, 1)

      eventManager.dispatchedEvents = [] // Reset

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Verify event was dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('OrderCreated')
      expect(eventManager.dispatchedEvents[0].order.id).toBe(order.id)
      expect(eventManager.dispatchedEvents[0].userId).toBe(1)
    })

    it('should dispatch OrderPaid event when marking as paid', async () => {
      const cart = await cartService.getOrCreateCart(5)
      await cartService.addItem(cart.id, 1, 1)

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      eventManager.dispatchedEvents = [] // Reset

      const paymentIntentId = 'pi_test_' + Date.now()
      await orderService.markAsPaid(order.id, paymentIntentId)

      // Verify event was dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('OrderPaid')
      expect(eventManager.dispatchedEvents[0].paymentIntentId).toBe(paymentIntentId)
      expect(eventManager.dispatchedEvents[0].amount).toBe(order.total)
    })

    it('should dispatch OrderCancelled event when cancelling order', async () => {
      const cart = await cartService.getOrCreateCart(6)
      await cartService.addItem(cart.id, 1, 1)

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      eventManager.dispatchedEvents = [] // Reset

      await orderService.cancelOrder(order.id)

      // Verify event was dispatched
      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('OrderCancelled')
      expect(eventManager.dispatchedEvents[0].order.id).toBe(order.id)
    })
  })

  describe('Complete Workflow Event Sequence', () => {
    it('should dispatch correct sequence of events in full workflow', async () => {
      eventManager.dispatchedEvents = [] // Reset

      // Step 1: Add items to cart (2 events)
      const cart = await cartService.getOrCreateCart(7)
      await cartService.addItem(cart.id, 1, 1)
      await cartService.addItem(cart.id, 1, 2) // Same product again

      expect(eventManager.dispatchedEvents).toHaveLength(2)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('CartItemAdded')
      expect(eventManager.dispatchedEvents[1].constructor.name).toBe('CartItemAdded')

      eventManager.dispatchedEvents = [] // Reset

      // Step 2: Create order (1 event)
      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('OrderCreated')

      eventManager.dispatchedEvents = [] // Reset

      // Step 3: Pay for order (1 event)
      await orderService.markAsPaid(order.id, 'pi_test_123')

      expect(eventManager.dispatchedEvents).toHaveLength(1)
      expect(eventManager.dispatchedEvents[0].constructor.name).toBe('OrderPaid')
    })
  })

  describe('Event Data Integrity', () => {
    it('should include complete order data in OrderCreated event', async () => {
      const cart = await cartService.getOrCreateCart(8)
      await cartService.addItem(cart.id, 1, 2)

      eventManager.dispatchedEvents = []

      await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      const event = eventManager.dispatchedEvents[0]
      const order = event.order

      expect(order.order_number).toBeDefined()
      expect(order.subtotal).toBe(300000) // 2 × 150000
      expect(order.total).toBeGreaterThan(order.subtotal) // includes shipping
      expect(order.items).toHaveLength(1)
    })

    it('should include cart item data in CartItemAdded event', async () => {
      const cart = await cartService.getOrCreateCart(9)

      eventManager.dispatchedEvents = []

      const _item = await cartService.addItem(cart.id, 1, 3)

      const event = eventManager.dispatchedEvents[0]

      expect(event.item.quantity).toBe(3)
      expect(event.item.price).toBe(150000)
      expect(event.item.product).toBeDefined()
      expect(event.item.product.name).toBe('Laptop')
    })
  })
})
