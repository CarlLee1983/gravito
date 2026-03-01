/**
 * GetOrder Use Case
 */

import type { Order } from '@domain/order/Order'
import type { OrderRepository } from '@infrastructure/repositories/OrderRepository'

export interface GetOrderRequest {
  orderId: string
  userId?: string // 用於驗證所有權
}

export class GetOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(request: GetOrderRequest): Promise<Order> {
    if (!request.orderId) {
      throw new Error('Order ID is required')
    }

    const order = await this.orderRepository.findById(request.orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // 驗證所有權（如果提供了 userId）
    if (request.userId && order.userId !== request.userId) {
      throw new Error('Unauthorized')
    }

    return order
  }
}

// Export alias for compatibility
export { GetOrderUseCase as GetOrder }
