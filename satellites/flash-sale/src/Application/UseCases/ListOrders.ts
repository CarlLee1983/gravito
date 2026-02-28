/**
 * ListOrders UseCase（薄殼）
 *
 * 接收 userId，委派 OrderLifecycleContext 查詢，
 * 使用 OrderMapper 轉換結果為 OrderDTO 陣列。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { OrderLifecycleContext } from '../../Domain/DCI/Contexts/OrderLifecycleContext'
import type { OrderDTO } from '../DTOs/OrderDTO'
import { OrderMapper } from '../DTOs/OrderDTO'

/**
 * ListOrders UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 OrderLifecycleContext
 */
export class ListOrders {
  private readonly lifecycleContext: OrderLifecycleContext

  constructor(orderRepo: IOrderRepository) {
    this.lifecycleContext = new OrderLifecycleContext(orderRepo)
  }

  /**
   * 查詢指定用戶的訂單列表
   *
   * @param userId - 用戶 ID
   * @returns OrderDTO 陣列
   */
  async execute(userId: string): Promise<OrderDTO[]> {
    // 委派 OrderLifecycleContext 查詢
    const orders = await this.lifecycleContext.listOrders(userId)

    // 轉換為 DTO
    return OrderMapper.toDTOList(orders)
  }
}
