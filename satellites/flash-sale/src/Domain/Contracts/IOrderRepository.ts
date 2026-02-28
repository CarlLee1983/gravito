/**
 * 訂單 Repository 合約（Domain Layer）
 *
 * 繼承 @gravito/enterprise 的 Repository 基礎介面，
 * 並擴展搶購系統特有的查詢方法。
 */

import type { Repository } from '@gravito/enterprise'
import type { Order } from '../Entities/Order'

/**
 * IOrderRepository
 *
 * 訂單聚合根的持久化合約
 */
export interface IOrderRepository extends Repository<Order, string> {
  /**
   * 根據用戶 ID 查詢訂單列表
   *
   * @param userId - 用戶唯一標識
   * @returns 該用戶的所有訂單
   */
  findByUserId(userId: string): Promise<Order[]>

  /**
   * 根據日期範圍查詢訂單
   *
   * @param startDate - 起始日期
   * @param endDate - 結束日期
   * @returns 指定範圍內的訂單列表
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>
}
