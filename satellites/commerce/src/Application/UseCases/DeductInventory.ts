/**
 * 扣減庫存 Use Case
 *
 * 當支付成功時執行此 Use Case：
 * 1. 驗證訂單存在且狀態為 PAID
 * 2. 呼叫 Flash-Sale Satellite 扣減庫存
 * 3. 更新訂單狀態為 CONFIRMED
 * 4. 發送 OrderConfirmed 事件
 */

import type { PlanetCore } from '@gravito/core'
import { DeductInventoryRequest, type OrderStatusTransition } from '../../Domain/Models'

export interface DeductInventoryResponse {
  success: boolean
  orderId: string
  message: string
  newStatus: string
}

/**
 * DeductInventory Use Case
 *
 * 這是 Commerce ← Payment 流程的核心
 * 當支付服務通知支付成功時，此 Use Case 執行庫存扣減
 */
export class DeductInventory {
  constructor(private core: PlanetCore) {}

  /**
   * 執行 Use Case
   *
   * @param orderId - 訂單 ID
   * @param productId - 商品 ID
   * @param quantity - 扣減數量
   */
  async execute(
    orderId: string,
    productId: string,
    quantity: number
  ): Promise<DeductInventoryResponse> {
    // 1. 驗證請求
    const request = new DeductInventoryRequest(orderId, productId, quantity)
    const validationErrors = request.validate()

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
    }

    this.core.logger.info(
      `[Commerce] Starting inventory deduction for order ${orderId}`
    )

    // 2. TODO: 查詢訂單驗證狀態為 PAID
    // const order = await this.orderRepository.findById(orderId)
    // if (!order) {
    //   throw new Error(`Order not found: ${orderId}`)
    // }
    // if (order.status !== OrderStatus.PAID) {
    //   throw new Error(`Order not in PAID status: ${order.status}`)
    // }

    // 3. TODO: 呼叫 Flash-Sale Satellite 扣減庫存
    // const productService = this.core.container.make('product.service')
    // await productService.deductStock(productId, quantity)

    // 4. TODO: 發送訂單狀態轉移事件
    // const transition: OrderStatusTransition = {
    //   orderId,
    //   fromStatus: OrderStatus.PAID,
    //   toStatus: OrderStatus.CONFIRMED,
    //   timestamp: new Date(),
    // }
    // this.core.events.dispatch(new OrderStatusChanged(transition))

    // 5. TODO: 更新訂單狀態
    // await this.orderRepository.updateStatus(orderId, OrderStatus.CONFIRMED)

    this.core.logger.info(`[Commerce] Inventory deducted for order ${orderId}`)

    return {
      success: true,
      orderId,
      message: 'Inventory deducted successfully',
      newStatus: 'CONFIRMED',
    }
  }
}
