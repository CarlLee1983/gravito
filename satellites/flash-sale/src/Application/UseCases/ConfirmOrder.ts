/**
 * 確認訂單 Use Case
 *
 * 在庫存成功扣減後，確認訂單狀態
 */

import { OrderStatus } from '../../Domain/Models'
import type { IOrderRepository } from '../Contracts/IOrderRepository'

export interface ConfirmOrderRequest {
  orderId: string
  lockId: string
}

export interface ConfirmOrderResponse {
  success: boolean
  message: string
}

/**
 * ConfirmOrder Use Case
 *
 * 確認訂單：
 * 1. 驗證訂單存在且狀態為 PENDING
 * 2. 更新訂單狀態為 CONFIRMED
 * 3. 記錄鎖定 ID
 */
export class ConfirmOrder {
  constructor(private orderRepository: IOrderRepository) {}

  /**
   * 執行 Use Case
   */
  async execute(request: ConfirmOrderRequest): Promise<ConfirmOrderResponse> {
    // 1. 查詢訂單
    const order = await this.orderRepository.findById(request.orderId)
    if (!order) {
      throw new Error(`Order not found: ${request.orderId}`)
    }

    // 2. 驗證訂單狀態
    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`Order status is not PENDING: ${order.status}. Cannot confirm order.`)
    }

    // 3. 更新訂單狀態為 CONFIRMED
    const updatedOrder = {
      ...order,
      status: OrderStatus.CONFIRMED,
      confirmedAt: new Date(),
    }

    await this.orderRepository.update(request.orderId, updatedOrder)

    return {
      success: true,
      message: `Order ${request.orderId} confirmed successfully.`,
    }
  }
}
