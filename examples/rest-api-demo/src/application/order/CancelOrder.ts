/**
 * CancelOrder Use Case
 */

import type { Order } from '@domain/order/Order'
import { OrderDomainService } from '@domain/order/Order'
import type { OrderRepository } from '@infrastructure/repositories/OrderRepository'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface CancelOrderRequest {
  orderId: string
  reason?: string
}

export class CancelOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository
  ) {}

  async execute(request: CancelOrderRequest): Promise<Order> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.orderId) {
      throw new Error('Order ID is required')
    }

    // =====================================================================
    // 2. 獲取訂單
    // =====================================================================
    const order = await this.orderRepository.findById(request.orderId)
    if (!order) {
      throw new Error('Order not found')
    }

    // =====================================================================
    // 3. 驗證訂單是否可以取消
    // =====================================================================
    if (!OrderDomainService.canBeCancelled(order)) {
      throw new Error(`Cannot cancel order with status ${order.status}`)
    }

    // =====================================================================
    // 4. 恢復庫存
    // =====================================================================
    for (const item of order.items) {
      await this.productRepository.increaseStock(item.productId, item.quantity)
    }

    // =====================================================================
    // 5. 更新訂單狀態
    // =====================================================================
    const cancelledOrder = await this.orderRepository.update(request.orderId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    })

    if (!cancelledOrder) {
      throw new Error('Failed to cancel order')
    }

    return cancelledOrder
  }
}
