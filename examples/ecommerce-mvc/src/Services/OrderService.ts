/**
 * Order Service
 *
 * Business logic for order processing.
 * Uses OrderRepository for data access.
 */

import type { OrderStatus, ShippingAddress } from '../models'
import type { CreateOrderInput } from '../Repositories'
import { OrderRepository } from '../Repositories'

export type { CreateOrderInput }

export class OrderService {
  constructor(private orderRepository = new OrderRepository()) {}

  /**
   * Create order from cart
   */
  async createOrder(input: CreateOrderInput) {
    return this.orderRepository.createOrder(input)
  }

  /**
   * Get order with items
   */
  async getOrder(orderId: number) {
    return this.orderRepository.getOrderWithItems(orderId)
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string) {
    return this.orderRepository.getByOrderNumber(orderNumber)
  }

  /**
   * Get order by Stripe session ID
   */
  async getOrderByStripeSession(sessionId: string) {
    return this.orderRepository.getByStripeSession(sessionId)
  }

  /**
   * Get orders for user
   */
  async getUserOrders(userId: number, page = 1, perPage = 10) {
    return this.orderRepository.getUserOrders(userId, page, perPage)
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: number, status: OrderStatus) {
    return this.orderRepository.updateStatus(orderId, status)
  }

  /**
   * Update Stripe session ID
   */
  async updateStripeSession(orderId: number, sessionId: string) {
    return this.orderRepository.updateStripeSession(orderId, sessionId)
  }

  /**
   * Mark order as paid
   */
  async markAsPaid(orderId: number, paymentIntentId: string) {
    return this.orderRepository.markAsPaid(orderId, paymentIntentId)
  }

  /**
   * Cancel order and restore stock
   */
  async cancelOrder(orderId: number) {
    return this.orderRepository.cancelOrder(orderId)
  }
}
