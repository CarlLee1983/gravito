/**
 * ShardedOrderRepository
 *
 * 分片訂單數據訪問層，實現 IOrderRepository 接口
 * - 單分片查詢：根據 userId 自動路由（高性能）
 * - 跨分片聚合：用於報表和統計分析
 */

import type { Logger } from '@gravito/core'
import type { IOrderRepository } from '../../Application/Contracts/IOrderRepository'
import { type Order, type OrderItem, OrderStatus } from '../../Domain/Models'
import type { ShardingManager } from '../Database/ShardingManager'

/**
 * ShardedOrderRepository
 *
 * 基於分片的訂單數據訪問層
 */
export class ShardedOrderRepository implements IOrderRepository {
  constructor(
    private shardingManager: ShardingManager,
    private logger: Logger
  ) {}

  /**
   * 根據 ID 查詢訂單
   *
   * 注：這種查詢需要在所有分片中進行跨分片查詢
   * 實際應用中應該在訂單 ID 中包含分片信息以優化性能
   *
   * @param id 訂單 ID
   * @returns 訂單對象或 null
   */
  async findById(id: string): Promise<Order | null> {
    const results = await this.shardingManager.aggregateQuery(async (connection) => {
      const result = await connection.table<Order>('orders').where('id', id).first()

      return result ? [result] : []
    })

    return results[0] || null
  }

  /**
   * 根據用戶 ID 查詢訂單列表
   *
   * 單分片查詢：根據 userId 自動路由到正確的分片
   * 性能：O(1) 分片定位 + O(n) 數據庫查詢
   *
   * @param userId 用戶 ID
   * @param options 查詢選項
   * @returns 訂單列表和分頁信息
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
    const shard = this.shardingManager.getShard(userId)
    const page = options?.page || 1
    const limit = options?.limit || 10

    // 構建查詢
    let query = shard.table<Order>('orders').where('user_id', userId)
    let countQuery = shard.table('orders').where('user_id', userId)

    if (options?.status) {
      query = query.where('status', options.status)
      countQuery = countQuery.where('status', options.status)
    }

    // 並行執行計數和數據查詢
    const [items, countResult] = await Promise.all([
      query
        .orderBy('created_at', 'desc')
        .offset((page - 1) * limit)
        .limit(limit)
        .get(),
      countQuery.count('* as total'),
    ])

    const total =
      countResult && Array.isArray(countResult) && countResult.length > 0
        ? (countResult[0] as unknown as { total: number }).total
        : 0

    return {
      items: items as Order[],
      total,
      page,
      limit,
    }
  }

  /**
   * 創建訂單
   *
   * 根據 userId 路由到特定分片
   *
   * @param data 訂單數據
   * @returns 創建的訂單
   */
  async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const shard = this.shardingManager.getShard(data.userId)

    const id = `order-${Date.now()}-${Math.random().toString(36).substring(7)}`
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

    // 插入訂單
    await shard.table('orders').insert({
      id: order.id,
      user_id: order.userId,
      status: order.status,
      total_amount: order.totalAmount,
      payment_method: order.paymentMethod,
      payment_id: order.paymentId,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    })

    // 插入訂單項目
    if (order.items && order.items.length > 0) {
      await shard.table('order_items').insert(
        order.items.map((item) => ({
          id: item.id,
          order_id: item.orderId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        }))
      )
    }

    this.logger.debug(`[ShardedOrderRepository] Order ${id} created for user ${data.userId}`)

    return order
  }

  /**
   * 更新訂單
   *
   * 注：需要知道 userId 來確定分片位置
   * 實際應用中應該在查詢時包含 userId 信息
   *
   * @param id 訂單 ID
   * @param data 更新數據
   * @returns 更新的訂單
   */
  async update(id: string, data: Partial<Order>): Promise<Order> {
    // 跨分片查詢找到訂單
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Order not found: ${id}`)
    }

    // 使用 userId 找到正確的分片
    const shard = this.shardingManager.getShard(existing.userId)

    const updated: Order = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }

    await shard.table('orders').where('id', id).update({
      status: updated.status,
      total_amount: updated.totalAmount,
      payment_method: updated.paymentMethod,
      payment_id: updated.paymentId,
      updated_at: updated.updatedAt,
    })

    this.logger.debug(`[ShardedOrderRepository] Order ${id} updated`)

    return updated
  }

  /**
   * 更新訂單狀態
   *
   * @param id 訂單 ID
   * @param status 新狀態
   * @returns 更新的訂單
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    // 跨分片查詢找到訂單
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Order not found: ${id}`)
    }

    const shard = this.shardingManager.getShard(existing.userId)
    const updated: Order = {
      ...existing,
      status,
      updatedAt: new Date(),
    }

    // 設置特定狀態的時間戳
    if (status === OrderStatus.PAID) {
      updated.paidAt = new Date()
    }

    if (status === OrderStatus.CONFIRMED) {
      updated.confirmedAt = new Date()
    }

    await shard.table('orders').where('id', id).update({
      status,
      paid_at: updated.paidAt,
      confirmed_at: updated.confirmedAt,
      updated_at: updated.updatedAt,
    })

    this.logger.debug(`[ShardedOrderRepository] Order ${id} status updated to ${status}`)

    return updated
  }

  /**
   * 刪除訂單（邏輯刪除）
   *
   * @param id 訂單 ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Order not found: ${id}`)
    }

    const shard = this.shardingManager.getShard(existing.userId)

    await shard.table('orders').where('id', id).update({
      status: OrderStatus.CANCELLED,
      updated_at: new Date(),
    })

    this.logger.debug(`[ShardedOrderRepository] Order ${id} deleted (logical)`)
  }

  /**
   * 查詢特定時間範圍內的訂單
   *
   * 跨分片聚合查詢：用於報表生成
   * 對所有分片執行相同的查詢並合併結果
   *
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @param userId 可選：特定用戶 ID
   * @returns 訂單列表
   */
  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Order[]> {
    if (userId) {
      // 單分片查詢
      const shard = this.shardingManager.getShard(userId)
      const results = await shard
        .table<Order>('orders')
        .where('user_id', userId)
        .whereBetween('created_at', [startDate, endDate])
        .get()

      return results as Order[]
    }

    // 跨分片聚合查詢
    return this.shardingManager.aggregateQuery(async (connection) => {
      const results = await connection
        .table<Order>('orders')
        .whereBetween('created_at', [startDate, endDate])
        .get()

      return results as Order[]
    })
  }
}
