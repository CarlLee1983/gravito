/**
 * GetOrder UseCase（薄殼）
 *
 * 接收 orderId，委派 OrderLifecycleContext 查詢，
 * 使用 OrderMapper 轉換結果為 OrderDTO。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { OrderLifecycleContext } from '../../Domain/DCI/Contexts/OrderLifecycleContext'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderDTO'

/**
 * GetOrder UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 OrderLifecycleContext
 */
export class GetOrder {
  private readonly lifecycleContext: OrderLifecycleContext

  constructor(orderRepo: IOrderRepository) {
    this.lifecycleContext = new OrderLifecycleContext(orderRepo)
  }

  /**
   * 查詢單一訂單
   *
   * @param orderId - 訂單 ID
   * @returns OrderDTO 或 null
   */
  async execute(orderId: string): Promise<OrderDTO | null> {
    // 委派 OrderLifecycleContext 查詢
    const order = await this.lifecycleContext.getOrder(orderId)

    if (!order) {
      return null
    }

    // 轉換為 DTO
    return OrderMapper.toDTO(order)
  }
}
