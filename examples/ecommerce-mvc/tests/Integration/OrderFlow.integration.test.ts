import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DB } from '@gravito/atlas'
import { OrderStatus } from '../../src/models'
import type { CreateOrderInput } from '../../src/Repositories'
import { CartRepository, OrderRepository } from '../../src/Repositories'
import { CartService, OrderService } from '../../src/Services'
import {
  cleanupAllTables,
  createCartTables,
  createOrderTables,
  createProductTables,
  createUserTables,
  setupTestDatabase,
} from './setup'

describe('Order Integration - Full Workflow', () => {
  let cartService: CartService
  let orderService: OrderService
  let cartRepository: CartRepository
  let orderRepository: OrderRepository

  const shippingAddress = {
    name: 'John Doe',
    phone: '0912345678',
    address: '123 Main Street',
    city: 'Taipei',
    postal_code: '100',
  }

  beforeAll(async () => {
    await setupTestDatabase()
    await createUserTables()
    await createCartTables()
    await createProductTables()
    await createOrderTables()
  })

  beforeEach(async () => {
    cartRepository = new CartRepository()
    orderRepository = new OrderRepository()
    cartService = new CartService(cartRepository)
    orderService = new OrderService(orderRepository)

    // Insert test user
    await DB.raw(
      `
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `,
      ['John Doe', 'john@example.com', 'hashed_password', 'customer']
    )

    // Insert test products
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['iPhone 15', 'iphone-15', 'https://example.com/iphone.jpg', 100, 35000, 1]
    )
    await DB.raw(
      `INSERT INTO products (name, slug, image_url, stock, price, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['AirPods Pro', 'airpods-pro', 'https://example.com/airpods.jpg', 150, 9000, 1]
    )
  })

  afterEach(async () => {
    // Clean up between tests
    await DB.raw('DELETE FROM order_items')
    await DB.raw('DELETE FROM orders')
    await DB.raw('DELETE FROM cart_items')
    await DB.raw('DELETE FROM carts')
    await DB.raw('DELETE FROM users')
    await DB.raw('DELETE FROM products')
  })

  describe('Complete Order Flow', () => {
    it('should create order from cart and validate stock deduction', async () => {
      // Step 1: Create cart and add products
      const cart = await cartService.getOrCreateCart(1)
      await cartService.addItem(cart.id, 1, 2) // 2 × iPhone
      await cartService.addItem(cart.id, 2, 1) // 1 × AirPods

      // Verify cart contents before order
      let cartItems = await cartService.getCartItems(cart.id)
      expect(cartItems).toHaveLength(2)

      // Step 2: Create order from cart
      const orderInput: CreateOrderInput = {
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      }

      const order = await orderService.createOrder(orderInput)

      // Step 3: Verify order properties
      expect(order.id).toBeGreaterThan(0)
      expect(order.user_id).toBe(1)
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.order_number).toMatch(/^ORD-\d{8}-[A-Z0-9]+$/)

      // Verify order total calculation
      const expectedSubtotal = 2 * 35000 + 1 * 9000 // 70000 + 9000
      const expectedTotal = expectedSubtotal + 6000 // + shipping
      expect(order.subtotal).toBe(expectedSubtotal)
      expect(order.total).toBe(expectedTotal)

      // Step 4: Verify stock was deducted
      const iphone = await DB.raw('SELECT stock FROM products WHERE id = 1', [])
      expect(iphone.rows[0].stock).toBe(98) // 100 - 2

      const airpods = await DB.raw('SELECT stock FROM products WHERE id = 2', [])
      expect(airpods.rows[0].stock).toBe(149) // 150 - 1

      // Step 5: Verify cart was cleared
      cartItems = await cartService.getCartItems(cart.id)
      expect(cartItems).toHaveLength(0)
    })

    it('should handle order payment flow (create → pay → confirm)', async () => {
      // Step 1: Create order
      const cart = await cartService.getOrCreateCart(2)
      await cartService.addItem(cart.id, 1, 1)

      const orderInput: CreateOrderInput = {
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      }

      const order = await orderService.createOrder(orderInput)
      expect(order.status).toBe(OrderStatus.PENDING)

      // Step 2: Simulate Stripe payment and mark as paid
      const stripeSessionId = 'cs_test_' + Date.now()
      const paymentIntentId = 'pi_test_' + Date.now()

      await orderService.updateStripeSession(order.id, stripeSessionId)
      await orderService.markAsPaid(order.id, paymentIntentId)

      // Step 3: Verify order is now paid
      const paidOrder = await orderService.getOrder(order.id)
      expect(paidOrder?.status).toBe(OrderStatus.PAID)
      expect(paidOrder?.stripe_payment_intent_id).toBe(paymentIntentId)
    })

    it('should prevent order cancellation after payment', async () => {
      // Step 1: Create and pay for order
      const cart = await cartService.getOrCreateCart(3)
      await cartService.addItem(cart.id, 1, 1)

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Mark as paid
      await orderService.markAsPaid(order.id, 'pi_test_123')

      // Step 2: Try to cancel paid order (should fail)
      // Note: Shipped orders cannot be cancelled, paid can be
      // Update status to shipped
      await orderService.updateStatus(order.id, OrderStatus.SHIPPED)

      // Now attempt cancel should fail
      const shippedOrder = await orderService.getOrder(order.id)
      expect(shippedOrder?.canBeCancelled()).toBe(false)

      expect(orderService.cancelOrder(order.id)).rejects.toThrow('Order cannot be cancelled')
    })

    it('should restore stock when cancelling order', async () => {
      // Step 1: Create order with products
      const cart = await cartService.getOrCreateCart(4)
      await cartService.addItem(cart.id, 1, 3) // 3 iPhones
      await cartService.addItem(cart.id, 2, 2) // 2 AirPods

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Verify stock deducted
      let iphone = await DB.raw('SELECT stock FROM products WHERE id = 1')
      expect(iphone.rows[0].stock).toBe(97) // 100 - 3

      // Step 2: Cancel order (must be in PENDING or PAID state)
      await orderService.cancelOrder(order.id)

      // Step 3: Verify stock restored
      iphone = await DB.raw('SELECT stock FROM products WHERE id = 1')
      expect(iphone.rows[0].stock).toBe(100) // Restored

      const airpods = await DB.raw('SELECT stock FROM products WHERE id = 2')
      expect(airpods.rows[0].stock).toBe(150) // Restored
    })
  })

  describe('Order Queries', () => {
    it('should find order by order number', async () => {
      // Create order
      const cart = await cartService.getOrCreateCart(5)
      await cartService.addItem(cart.id, 1, 1)

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Find by order number
      const foundOrder = await orderService.getOrderByNumber(order.order_number)
      expect(foundOrder?.id).toBe(order.id)
      expect(foundOrder?.order_number).toBe(order.order_number)
    })

    it('should find order by Stripe session ID', async () => {
      // Create order
      const cart = await cartService.getOrCreateCart(6)
      await cartService.addItem(cart.id, 1, 1)

      const order = await orderService.createOrder({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Update Stripe session
      const sessionId = 'cs_test_session_123'
      await orderService.updateStripeSession(order.id, sessionId)

      // Find by session ID
      const foundOrder = await orderService.getOrderByStripeSession(sessionId)
      expect(foundOrder?.stripe_session_id).toBe(sessionId)
    })

    it('should get paginated user orders', async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        const cart = await cartService.getOrCreateCart(7)
        await cartService.addItem(cart.id, 1, 1)
        await orderService.createOrder({
          userId: 1,
          cartId: cart.id,
          shippingAddress,
        })
      }

      // Get first page (2 per page)
      const page1 = await orderService.getUserOrders(1, 1, 2)
      expect(page1.orders).toHaveLength(2)
      expect(page1.total).toBe(5)
      expect(page1.totalPages).toBe(3)

      // Get second page
      const page2 = await orderService.getUserOrders(1, 2, 2)
      expect(page2.orders).toHaveLength(2)

      // Get third page
      const page3 = await orderService.getUserOrders(1, 3, 2)
      expect(page3.orders).toHaveLength(1)
    })
  })

  describe('Order DTO Presentation', () => {
    it('should return properly formatted OrderResponseDTO', async () => {
      // Create order
      const cart = await cartService.getOrCreateCart(8)
      await cartService.addItem(cart.id, 1, 1)
      await cartService.addItem(cart.id, 2, 2)

      const order = await orderService.createOrderAsDTO({
        userId: 1,
        cartId: cart.id,
        shippingAddress,
      })

      // Verify DTO structure
      expect(order.orderNumber).toMatch(/^ORD-/)
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.statusLabel).toBe('待付款') // Chinese for "Pending Payment"
      expect(order.userId).toBe(1)

      // Verify calculations
      expect(order.subtotal).toBe(35000 + 18000) // 1×iPhone + 2×AirPods
      expect(order.total).toBe(35000 + 18000 + 6000) // + shipping

      // Verify formatted total
      expect(order.formattedTotal).toMatch(/NT\$/)

      // Verify items
      expect(order.items).toHaveLength(2)
      expect(order.canBeCancelled).toBe(true)
    })

    it('should return null for non-existent order', async () => {
      const order = await orderService.getOrderAsDTO(99999)
      expect(order).toBeNull()
    })
  })
})
