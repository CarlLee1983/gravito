/**
 * OrderLifecycleContext - 訂單生命週期 Context
 *
 * 協調 OrderOwnerRole 管理訂單生命週期：
 * - 確認訂單
 * - 查詢單一訂單
 * - 列出用戶訂單
 */

import { FlashSaleError } from '../../../Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import type { Order } from '../../Entities/Order'
import { injectOrderOwner } from '../Roles/OrderOwnerRole'

/**
 * OrderLifecycleContext
 *
 * 訂單生命週期管理的 DCI Context
 */
export class OrderLifecycleContext {
  constructor(private readonly orderRepo: IOrderRepository) {}

  /**
   * 確認訂單
   *
   * @param orderId - 訂單 ID
   * @returns 確認後的訂單
   * @throws FlashSaleError 若訂單不存在或狀態不正確
   */
  async confirm(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId)
    if (!order) {
      throw FlashSaleError.orderNotFound(orderId)
    }

    // 注入 OrderOwnerRole 並確認
    const owner = injectOrderOwner(order, this.orderRepo)
    await owner.confirm()

    return order
  }

  /**
   * 查詢單一訂單
   *
   * @param orderId - 訂單 ID
   * @returns 訂單或 null
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orderRepo.findById(orderId)
  }

  /**
   * 列出指定用戶的訂單
   *
   * @param userId - 用戶 ID
   * @returns 訂單列表
   */
  async listOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.findByUserId(userId)
  }
}
