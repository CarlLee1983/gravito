/**
 * Mock Order Repository
 *
 * 測試用的訂單數據源，模擬真實 Repository 行為
 * 用於快取優化測試與性能基準測試
 */

import type { IOrderRepository } from '../../Application/Contracts/IOrderRepository'
import { type Order, type OrderItem, OrderStatus } from '../../Domain/Models'

/**
 * MockOrderRepository
 *
 * 提供內存中的訂單存儲，用於測試環境
 */
export class MockOrderRepository implements IOrderRepository {
  private orders: Map<string, Order> = new Map()
  private ordersByUserId: Map<string, string[]> = new Map() // userId -> orderId[] 索引
  private orderCounter = 0

  /**
   * 根據 ID 查詢訂單
   */
  async findById(id: string): Promise<Order | null> {
    await this.simulateLatency()
    return this.orders.get(id) || null
  }

  /**
   * 根據用戶 ID 查詢訂單列表
   */
  async findByUserId(
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
  }> {
    await this.simulateLatency()

    const page = options?.page || 1
    const limit = options?.limit || 10
    const status = options?.status

    // 取得用戶的所有訂單 ID
    const userOrderIds = this.ordersByUserId.get(userId) || []

    // 根據訂單 ID 取得訂單對象，並按狀態過濾
    let userOrders = userOrderIds
      .map((id) => this.orders.get(id))
      .filter((order): order is Order => order !== undefined)

    if (status) {
      userOrders = userOrders.filter((order) => order.status === status)
    }

    // 按建立時間降序排列
    userOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = userOrders.length
    const start = (page - 1) * limit
    const end = start + limit

    return {
      items: userOrders.slice(start, end),
      total,
      page,
      limit,
    }
  }

  /**
   * 建立訂單
   */
  async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    await this.simulateLatency()

    const id = `order-${Date.now()}-${++this.orderCounter}`
    const now = new Date()

    // 修復訂單項目的 orderId
    const items: OrderItem[] = data.items.map((item) => ({
      ...item,
      orderId: id,
    }))

    const order: Order = {
      ...data,
      id,
      items,
      createdAt: now,
      updatedAt: now,
    }

    this.orders.set(id, order)

    // 更新用戶訂單索引
    const userOrders = this.ordersByUserId.get(data.userId) || []
    userOrders.push(id)
    this.ordersByUserId.set(data.userId, userOrders)

    return order
  }

  /**
   * 更新訂單
   */
  async update(id: string, data: Partial<Order>): Promise<Order> {
    await this.simulateLatency()

    const existing = this.orders.get(id)
    if (!existing) {
      throw new Error(`Order not found: ${id}`)
    }

    const updated: Order = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }

    this.orders.set(id, updated)
    return updated
  }

  /**
   * 更新訂單狀態
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await this.simulateLatency()

    const existing = this.orders.get(id)
    if (!existing) {
      throw new Error(`Order not found: ${id}`)
    }

    const updated: Order = {
      ...existing,
      status,
      updatedAt: new Date(),
    }

    // 如果是支付成功，記錄支付時間
    if (status === OrderStatus.PAID) {
      updated.paidAt = new Date()
    }

    // 如果是確認狀態，記錄確認時間
    if (status === OrderStatus.CONFIRMED) {
      updated.confirmedAt = new Date()
    }

    this.orders.set(id, updated)
    return updated
  }

  /**
   * 刪除訂單（邏輯刪除）
   */
  async delete(id: string): Promise<void> {
    await this.simulateLatency()

    const order = this.orders.get(id)
    if (!order) {
      throw new Error(`Order not found: ${id}`)
    }

    // 標記為已取消
    order.status = OrderStatus.CANCELLED
    order.updatedAt = new Date()
  }

  /**
   * 查詢特定時間範圍內的訂單（用於分析）
   */
  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Order[]> {
    await this.simulateLatency()

    let orders = Array.from(this.orders.values())

    // 按用戶過濾
    if (userId) {
      const userOrderIds = this.ordersByUserId.get(userId) || []
      orders = orders.filter((order) => userOrderIds.includes(order.id))
    }

    // 按日期範圍過濾
    orders = orders.filter((order) => order.createdAt >= startDate && order.createdAt <= endDate)

    return orders
  }

  /**
   * 模擬數據庫查詢延遲（0-5ms）
   */
  private async simulateLatency(): Promise<void> {
    const delay = Math.random() * 5
    return new Promise((resolve) => setTimeout(resolve, delay))
  }

  /**
   * 清空所有數據（用於測試重置）
   */
  async reset(): Promise<void> {
    this.orders.clear()
    this.ordersByUserId.clear()
    this.orderCounter = 0
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
      totalAmount += order.totalAmount
    }

    return {
      totalOrders: orders.length,
      ordersByStatus,
      totalAmount,
    }
  }
}
