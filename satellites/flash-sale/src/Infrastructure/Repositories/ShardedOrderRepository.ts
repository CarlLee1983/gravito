/**
 * ShardedOrderRepository
 *
 * 分片訂單數據訪問層，實現 Domain 層 IOrderRepository 合約。
 * - 單分片查詢：根據 userId 自動路由（高性能）
 * - 跨分片聚合：用於報表和統計分析
 *
 * 注：此 Repository 接收和返回 Order Entity，
 * 內部使用 mapToDomain/mapToRaw 進行 DB 格式轉換。
 */

import type { Logger } from '@gravito/core'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { Order } from '../../Domain/Entities/Order'
import { OrderStatus } from '../../Domain/Models'
import { Money } from '../../Domain/ValueObjects/Money'
import { OrderItem } from '../../Domain/ValueObjects/OrderItem'
import type { ShardingManager } from '../Database/ShardingManager'

/**
 * DB 原始訂單格式
 */
interface RawOrder {
  id: string
  user_id: string
  status: OrderStatus
  total_amount: number
  payment_method?: string
  payment_id?: string
  created_at: Date
  updated_at: Date
  paid_at?: Date
  confirmed_at?: Date
}

/**
 * DB 原始訂單項目格式
 */
interface RawOrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

/**
 * ShardedOrderRepository
 *
 * 基於分片的訂單數據訪問層，返回 Order Entity
 */
export class ShardedOrderRepository implements IOrderRepository {
  constructor(
    private shardingManager: ShardingManager,
    private logger: Logger
  ) {}

  /**
   * 從 DB 原始資料重建 Order Entity
   */
  private mapToDomain(raw: RawOrder, rawItems: RawOrderItem[] = []): Order {
    const items = rawItems.map((item) =>
      OrderItem.create(item.product_id, item.product_name, item.quantity, Money.of(item.unit_price))
    )

    return Order.reconstitute(raw.id, {
      userId: raw.user_id,
      items,
      totalAmount: Money.of(raw.total_amount),
      status: raw.status,
      createdAt: raw.created_at,
    })
  }

  /**
   * 將 Order Entity 轉換為 DB 格式
   */
  private mapToRaw(entity: Order): {
    order: RawOrder
    items: RawOrderItem[]
  } {
    return {
      order: {
        id: entity.id,
        user_id: entity.userId,
        status: entity.status,
        total_amount: entity.totalAmount.value,
        created_at: entity.createdAt,
        updated_at: new Date(),
      },
      items: entity.items.map((item, index) => ({
        id: `${entity.id}-${index}`,
        order_id: entity.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice.value,
        total_price: item.totalPrice.value,
      })),
    }
  }

  /**
   * 保存 Order Entity
   */
  async save(entity: Order): Promise<void> {
    const shard = this.shardingManager.getShard(entity.userId)
    const { order, items } = this.mapToRaw(entity)

    // Upsert 訂單
    await shard.table('orders').insert({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
    })

    // 插入訂單項目
    if (items.length > 0) {
      await shard.table('order_items').insert(
        items.map((item) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      )
    }

    this.logger.debug(`[ShardedOrderRepository] Order ${entity.id} saved`)
  }

  /**
   * 根據 ID 查詢訂單，返回 Order Entity
   */
  async findById(id: string): Promise<Order | null> {
    const results = await this.shardingManager.aggregateQuery(async (connection) => {
      const result = await connection.table<RawOrder>('orders').where('id', id).first()
      return result ? [result] : []
    })

    if (results.length === 0) {
      return null
    }

    return this.mapToDomain(results[0] as RawOrder)
  }

  /**
   * 查詢所有訂單，返回 Order Entity 陣列
   */
  async findAll(): Promise<Order[]> {
    const results = await this.shardingManager.aggregateQuery(async (connection) => {
      return await connection.table<RawOrder>('orders').get()
    })

    return (results as RawOrder[]).map((raw) => this.mapToDomain(raw))
  }

  /**
   * 刪除訂單
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
   * 檢查訂單是否存在
   */
  async exists(id: string): Promise<boolean> {
    const order = await this.findById(id)
    return order !== null
  }

  /**
   * 根據用戶 ID 查詢訂單列表，返回 Order Entity 陣列
   */
  async findByUserId(userId: string): Promise<Order[]> {
    const shard = this.shardingManager.getShard(userId)
    const results = await shard
      .table<RawOrder>('orders')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .get()

    return (results as RawOrder[]).map((raw) => this.mapToDomain(raw))
  }

  /**
   * 根據日期範圍查詢訂單，返回 Order Entity 陣列
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    const results = await this.shardingManager.aggregateQuery(async (connection) => {
      return await connection
        .table<RawOrder>('orders')
        .whereBetween('created_at', [startDate, endDate])
        .get()
    })

    return (results as RawOrder[]).map((raw) => this.mapToDomain(raw))
  }
}
