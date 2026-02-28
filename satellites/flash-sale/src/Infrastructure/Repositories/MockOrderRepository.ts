/**
 * Mock Order Repository
 *
 * 測試用的訂單數據源，返回 Order Entity。
 * 內部以 Order Entity 儲存，實現 Domain 層的 IOrderRepository 合約。
 */

import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import type { Order } from '../../Domain/Entities/Order'

/**
 * MockOrderRepository
 *
 * 提供內存中的訂單存儲，用於測試環境。
 * 實現 Domain 層 IOrderRepository（基於 Repository<Order, string>）。
 */
export class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()
  private ordersByUserId: Map<string, string[]> = new Map()

  /**
   * 保存 Order Entity
   */
  async save(entity: Order): Promise<void> {
    this.orders.set(entity.id, entity)

    // 更新用戶訂單索引
    const userOrders = this.ordersByUserId.get(entity.userId) ?? []
    if (!userOrders.includes(entity.id)) {
      userOrders.push(entity.id)
      this.ordersByUserId.set(entity.userId, userOrders)
    }
  }

  /**
   * 根據 ID 查詢訂單，返回 Order Entity
   */
  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  /**
   * 查詢所有訂單，返回 Order Entity 陣列
   */
  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values())
  }

  /**
   * 刪除訂單
   */
  async delete(id: string): Promise<void> {
    const order = this.orders.get(id)
    if (order) {
      this.orders.delete(id)

      // 更新用戶訂單索引
      const userOrders = this.ordersByUserId.get(order.userId) ?? []
      const filtered = userOrders.filter((oid) => oid !== id)
      if (filtered.length > 0) {
        this.ordersByUserId.set(order.userId, filtered)
      } else {
        this.ordersByUserId.delete(order.userId)
      }
    }
  }

  /**
   * 檢查訂單是否存在
   */
  async exists(id: string): Promise<boolean> {
    return this.orders.has(id)
  }

  /**
   * 根據用戶 ID 查詢訂單列表，返回 Order Entity 陣列
   */
  async findByUserId(userId: string): Promise<Order[]> {
    const userOrderIds = this.ordersByUserId.get(userId) ?? []
    return userOrderIds
      .map((id) => this.orders.get(id))
      .filter((order): order is Order => order !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * 根據日期範圍查詢訂單，返回 Order Entity 陣列
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.createdAt >= startDate && order.createdAt <= endDate
    )
  }

  /**
   * 清空所有數據（用於測試重置）
   */
  async reset(): Promise<void> {
    this.orders.clear()
    this.ordersByUserId.clear()
  }

  /**
   * 取得統計資訊
   */
  getStats(): {
    totalOrders: number
    ordersByStatus: Record<string, number>
    totalAmount: number
  } {
    const orders = Array.from(this.orders.values())
    const ordersByStatus: Record<string, number> = {}
    let totalAmount = 0

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1
      totalAmount += order.totalAmount.value
    }

    return {
      totalOrders: orders.length,
      ordersByStatus,
      totalAmount,
    }
  }
}
