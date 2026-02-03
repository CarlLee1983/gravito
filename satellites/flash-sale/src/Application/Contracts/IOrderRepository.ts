/**
 * 訂單 Repository 合約
 */

import type { Order, OrderStatus } from '../../Domain/Models'

/**
 * 訂單 Repository 介面
 */
export interface IOrderRepository {
  /**
   * 根據 ID 查詢訂單
   */
  findById(id: string): Promise<Order | null>

  /**
   * 根據用戶 ID 查詢訂單列表
   */
  findByUserId(
    userId: string,
    options?: {
      status?: OrderStatus
      page?: number
      limit?: number
    }
  ): Promise<{
    items: Order[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 建立訂單
   */
  create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order>

  /**
   * 更新訂單
   */
  update(id: string, data: Partial<Order>): Promise<Order>

  /**
   * 更新訂單狀態
   */
  updateStatus(id: string, status: OrderStatus): Promise<Order>

  /**
   * 刪除訂單（邏輯刪除）
   */
  delete(id: string): Promise<void>

  /**
   * 查詢特定時間範圍內的訂單（用於分析）
   */
  findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Order[]>
}
