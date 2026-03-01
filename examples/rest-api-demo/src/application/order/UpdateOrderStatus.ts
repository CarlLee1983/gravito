/**
 * UpdateOrderStatus Use Case
 */

import type { Order, OrderStatus, UpdateOrderStatusInput } from '@domain/order/Order'
import { OrderDomainService } from '@domain/order/Order'
import type { OrderRepository } from '@infrastructure/repositories/OrderRepository'

export interface UpdateOrderStatusRequest {
  orderId: string
  status: OrderStatus
  trackingNumber?: string
}

export class UpdateOrderStatusUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(request: UpdateOrderStatusRequest): Promise<Order> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.orderId || !request.status) {
      throw new Error('Order ID and status are required')
    }

    // =====================================================================
    // 2. 獲取訂單
    // =====================================================================
    const order = await this.orderRepository.findById(request.orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // =====================================================================
    // 3. 驗證狀態轉換
    // =====================================================================
    if (!OrderDomainService.isValidStatusTransition(order.status, request.status)) {
      throw new Error(`Cannot transition from ${order.status} to ${request.status}`)
    }

    // =====================================================================
    // 4. 更新訂單狀態
    // =====================================================================
    const updateInput: UpdateOrderStatusInput = {
      status: request.status,
      trackingNumber: request.trackingNumber,
    }

    const updatedOrder = await this.orderRepository.updateStatus(request.orderId, updateInput)
    if (!updatedOrder) {
      throw new Error('Failed to update order status')
    }

    return updatedOrder
  }
}

// Export alias for compatibility
export { UpdateOrderStatusUseCase as UpdateOrderStatus }
