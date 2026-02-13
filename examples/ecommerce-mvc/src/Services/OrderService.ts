/**
 * Order Service
 *
 * Business logic for order processing.
 * Uses OrderRepository for data access.
 * Returns DTOs via Presenters for API responses.
 * Dispatches domain events for order state changes.
 */

import type { EventManager } from '@gravito/core'
import { OrderCancelled, OrderCreated, OrderPaid } from '../Events'
import type { OrderStatus } from '../models'
import { OrderPresenter, type OrderResponseDTO } from '../Presenters'
import type { CreateOrderInput } from '../Repositories'
import { OrderRepository } from '../Repositories'

export type { CreateOrderInput }

export class OrderService {
  constructor(
    private orderRepository = new OrderRepository(),
    private events?: EventManager
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Internal Methods (return raw models)
  // ─────────────────────────────────────────────────────────────

  /**
   * Create order from cart
   */
  async createOrder(input: CreateOrderInput) {
    const order = await this.orderRepository.createOrder(input)
    // Emit OrderCreated event for downstream processing
    if (this.events) {
      await this.events.dispatch(new OrderCreated(order, input.userId))
    }
    return order
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
    await this.orderRepository.markAsPaid(orderId, paymentIntentId)
    // Emit OrderPaid event for order processing
    const order = await this.orderRepository.getOrderWithItems(orderId)
    if (this.events && order) {
      await this.events.dispatch(new OrderPaid(order, paymentIntentId, order.total))
    }
  }

  /**
   * Cancel order and restore stock
   */
  async cancelOrder(orderId: number) {
    const order = await this.orderRepository.getOrderWithItems(orderId)
    await this.orderRepository.cancelOrder(orderId)
    // Emit OrderCancelled event for cancellation processing
    if (this.events && order) {
      await this.events.dispatch(new OrderCancelled(order))
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Presenter Methods (return DTOs for API responses)
  // ─────────────────────────────────────────────────────────────

  /**
   * Create order and return DTO (for API responses)
   */
  async createOrderAsDTO(input: CreateOrderInput): Promise<OrderResponseDTO> {
    const order = await this.createOrder(input)
    return OrderPresenter.present(order)
  }

  /**
   * Get order as DTO
   */
  async getOrderAsDTO(orderId: number): Promise<OrderResponseDTO | null> {
    const order = await this.orderRepository.getOrderWithItems(orderId)
    return order ? OrderPresenter.present(order) : null
  }

  /**
   * Get order by number as DTO
   */
  async getOrderByNumberAsDTO(orderNumber: string): Promise<OrderResponseDTO | null> {
    const order = await this.orderRepository.getByOrderNumber(orderNumber)
    return order ? OrderPresenter.present(order) : null
  }

  /**
   * Get order by Stripe session as DTO
   */
  async getOrderByStripeSessionAsDTO(sessionId: string): Promise<OrderResponseDTO | null> {
    const order = await this.orderRepository.getByStripeSession(sessionId)
    return order ? OrderPresenter.present(order) : null
  }

  /**
   * Get user orders as DTOs with pagination
   */
  async getUserOrdersAsDTO(userId: number, page = 1, perPage = 10) {
    const result = await this.orderRepository.getUserOrders(userId, page, perPage)
    return {
      orders: result.orders.map((order) => OrderPresenter.present(order)),
      total: result.total,
      totalPages: result.totalPages,
    }
  }
}
