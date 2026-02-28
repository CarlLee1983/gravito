/**
 * ConfirmOrder UseCase（薄殼）
 *
 * 接收 orderId，委派 OrderLifecycleContext 執行確認邏輯，
 * 使用 OrderMapper 轉換結果為 OrderDTO。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { OrderLifecycleContext } from '../../Domain/DCI/Contexts/OrderLifecycleContext'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderDTO'

/**
 * ConfirmOrder UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 OrderLifecycleContext
 */
export class ConfirmOrder {
  private readonly lifecycleContext: OrderLifecycleContext

  constructor(orderRepo: IOrderRepository) {
    this.lifecycleContext = new OrderLifecycleContext(orderRepo)
  }

  /**
   * 確認訂單
   *
   * @param orderId - 訂單 ID
   * @returns 確認後的 OrderDTO
   * @throws FlashSaleError 若訂單不存在或狀態不正確
   */
  async execute(orderId: string): Promise<OrderDTO> {
    // 委派 OrderLifecycleContext 執行確認邏輯
    const order = await this.lifecycleContext.confirm(orderId)

    // 轉換為 DTO
    return OrderMapper.toDTO(order)
  }
}
