/**
 * OrderOwnerRole - 訂單擁有者角色
 *
 * 職責：管理訂單狀態轉換
 * - 確認訂單（PENDING -> CONFIRMED）
 * - 取消訂單（任何非 CANCELLED -> CANCELLED）
 * - 持久化訂單變更
 *
 * 使用 Closures Pattern：注入 Order entity + IOrderRepository
 */

import { FlashSaleError } from '../../../Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import type { Order } from '../../Entities/Order'
import { OrderStatus } from '../../Models'

/**
 * OrderOwnerRole 回傳的行為介面
 */
export interface OrderOwner {
  /** 確認訂單 */
  confirm(): Promise<void>
  /** 取消訂單 */
  cancel(): Promise<void>
}

/**
 * 注入 OrderOwner 角色
 *
 * @param order - 訂單聚合根
 * @param repository - 訂單 Repository（用於持久化）
 * @returns 包含訂單狀態管理行為的閉包物件
 */
export function injectOrderOwner(order: Order, repository: IOrderRepository): OrderOwner {
  return {
    async confirm(): Promise<void> {
      // DCI 設計：Role 層負責驗證狀態機，Entity 只做狀態轉換
      if (order.status !== OrderStatus.PENDING) {
        throw FlashSaleError.invalidOrderStatus(order.status, OrderStatus.CONFIRMED)
      }
      order.transitionToConfirmed()
      await repository.save(order)
    },

    async cancel(): Promise<void> {
      // DCI 設計：Role 層負責驗證狀態機，Entity 只做狀態轉換
      if (order.status === OrderStatus.CANCELLED) {
        throw FlashSaleError.invalidOrderStatus(order.status, OrderStatus.CANCELLED)
      }
      order.transitionToCancelled()
      await repository.save(order)
    },
  }
}
