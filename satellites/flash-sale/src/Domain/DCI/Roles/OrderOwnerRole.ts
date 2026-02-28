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

import type { IOrderRepository } from '../../Contracts/IOrderRepository'
import type { Order } from '../../Entities/Order'

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
      // confirm() 內部會驗證狀態機（必須為 PENDING）
      order.confirm()
      await repository.save(order)
    },

    async cancel(): Promise<void> {
      // cancel() 內部會驗證狀態機（不能為 CANCELLED）
      order.cancel()
      await repository.save(order)
    },
  }
}
