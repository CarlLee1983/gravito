import { DB, ModelRepository } from '@gravito/atlas'
import type { ShippingAddress } from '../models'
import { Order, OrderItem, OrderStatus } from '../models'
import { sql } from '../utils/db'

/**
 * Order Input
 */
export interface CreateOrderInput {
  userId: number
  cartId: number
  shippingAddress: ShippingAddress
  notes?: string
}

/**
 * Order Repository
 *
 * Handles all order-related database operations.
 */
export class OrderRepository extends ModelRepository<Order> {
  protected modelClass = Order

  /**
   * Create order from cart
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // Get cart items
    const cartItemsResult = await DB.raw(
      sql(`
      SELECT ci.*, p.name as product_name, p.stock as product_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `),
      [input.cartId]
    )

    const cartItems = cartItemsResult.rows

    if (cartItems.length === 0) {
      throw new Error('Cart is empty')
    }

    // Validate stock
    for (const item of cartItems) {
      if ((item as any).product_stock < (item as any).quantity) {
        throw new Error(`Insufficient stock for ${(item as any).product_name}`)
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )
    const tax = 0 // Taiwan has no additional sales tax on displayed prices
    const shipping = 6000 // Default shipping 60 TWD
    const total = subtotal + tax + shipping

    // Generate order number
    const orderNumber = Order.generateOrderNumber()

    // Create order
    const orderResult = await DB.raw<{ id: number }>(
      sql(`
      INSERT INTO orders (user_id, order_number, status, subtotal, tax, shipping, total, shipping_address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `),
      [
        input.userId,
        orderNumber,
        OrderStatus.PENDING,
        subtotal,
        tax,
        shipping,
        total,
        JSON.stringify(input.shippingAddress),
        input.notes || null,
      ]
    )

    const orderId = orderResult.rows[0]?.id

    // Create order items
    for (const item of cartItems) {
      await DB.raw(
        sql(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `),
        [
          orderId,
          (item as any).product_id,
          (item as any).product_name,
          (item as any).quantity,
          (item as any).price,
        ]
      )

      // Deduct stock
      await DB.raw(sql('UPDATE products SET stock = stock - ? WHERE id = ?'), [
        (item as any).quantity,
        (item as any).product_id,
      ])
    }

    // Clear cart
    await DB.raw(sql('DELETE FROM cart_items WHERE cart_id = ?'), [input.cartId])

    // Return order with items
    const order = await this.getOrderWithItems(orderId)
    if (!order) {
      throw new Error('Failed to retrieve created order')
    }
    return order
  }

  /**
   * Get order with items
   */
  async getOrderWithItems(orderId: number): Promise<Order | null> {
    const order = await this.find(orderId)
    if (!order) {
      return null
    }

    // Get order items
    const itemsResult = await DB.raw(sql('SELECT * FROM order_items WHERE order_id = ?'), [orderId])
    order.items = itemsResult.rows.map((row: any) => {
      return OrderItem.hydrate(row)
    })

    return order
  }

  /**
   * Get order by order number
   */
  async getByOrderNumber(orderNumber: string): Promise<Order | null> {
    const result = await DB.raw<{ id: number }>(
      sql('SELECT id FROM orders WHERE order_number = ?'),
      [orderNumber]
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }
    return this.getOrderWithItems(row.id)
  }

  /**
   * Get order by Stripe session ID
   */
  async getByStripeSession(sessionId: string): Promise<Order | null> {
    const result = await DB.raw<{ id: number }>(
      sql('SELECT id FROM orders WHERE stripe_session_id = ?'),
      [sessionId]
    )
    const row = result.rows[0]
    if (!row) {
      return null
    }
    return this.getOrderWithItems(row.id)
  }

  /**
   * Get orders for user with pagination
   */
  async getUserOrders(
    userId: number,
    page = 1,
    perPage = 10
  ): Promise<{
    orders: Order[]
    total: number
    totalPages: number
  }> {
    const offset = (page - 1) * perPage

    const ordersResult = await DB.raw(
      sql(`
      SELECT * FROM orders WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `),
      [userId, perPage, offset]
    )

    const countResult = await DB.raw<{ count: number }>(
      sql('SELECT COUNT(*) as count FROM orders WHERE user_id = ?'),
      [userId]
    )
    const total = countResult.rows[0]?.count || 0

    const orders = ordersResult.rows.map((row: any) => {
      return Order.hydrate(row)
    })

    return {
      orders,
      total,
      totalPages: Math.ceil(total / perPage),
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: number, status: OrderStatus): Promise<void> {
    await DB.raw(sql('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'), [
      status,
      orderId,
    ])
  }

  /**
   * Update Stripe session ID
   */
  async updateStripeSession(orderId: number, sessionId: string): Promise<void> {
    await DB.raw(sql('UPDATE orders SET stripe_session_id = ? WHERE id = ?'), [sessionId, orderId])
  }

  /**
   * Mark order as paid
   */
  async markAsPaid(orderId: number, paymentIntentId: string): Promise<void> {
    await DB.raw(
      sql(`
      UPDATE orders SET
        status = ?,
        stripe_payment_intent_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
      [OrderStatus.PAID, paymentIntentId, orderId]
    )
  }

  /**
   * Cancel order and restore stock
   */
  async cancelOrder(orderId: number, orderWithItems?: Order): Promise<void> {
    const order = orderWithItems || (await this.getOrderWithItems(orderId))
    if (!order) {
      throw new Error('Order not found')
    }
    if (!order.canBeCancelled()) {
      throw new Error('Order cannot be cancelled')
    }

    // Restore stock
    if (order.items) {
      for (const item of order.items) {
        await DB.raw(sql('UPDATE products SET stock = stock + ? WHERE id = ?'), [
          item.quantity,
          item.product_id,
        ])
      }
    }

    await this.updateStatus(orderId, OrderStatus.CANCELLED)
  }
}
