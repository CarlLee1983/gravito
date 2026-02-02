/**
 * 查詢訂單 Use Case
 *
 * 支持 Redis 快取（60 秒 TTL）
 */

import type { Order } from '../../Domain/Models'
import type { CacheService } from '../../Infrastructure/Services/CacheService'
import type { IOrderRepository } from '../Contracts/IOrderRepository'

/**
 * GetOrder Use Case
 *
 * 根據訂單 ID 查詢訂單詳情
 * 查詢結果在 60 秒內快取
 */
export class GetOrder {
  constructor(
    private repository: IOrderRepository,
    private cache?: CacheService
  ) {}

  /**
   * 生成快取鍵
   */
  private getCacheKey(orderId: string): string {
    return `order:${orderId}`
  }

  /**
   * 執行 Use Case
   */
  async execute(orderId: string): Promise<Order | null> {
    if (!orderId?.trim()) {
      throw new Error('Order ID is required')
    }

    // 嘗試從快取讀取
    if (this.cache) {
      const cacheKey = this.getCacheKey(orderId)
      const cached = await this.cache.get<Order>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 快取未命中，查詢數據庫
    const order = await this.repository.findById(orderId)

    // 如果訂單存在，保存到快取（60 秒）
    if (order && this.cache) {
      const cacheKey = this.getCacheKey(orderId)
      await this.cache.set(cacheKey, order, { ttl: 60 })
    }

    return order
  }
}
