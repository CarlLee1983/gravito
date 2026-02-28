import type { Repository } from '@gravito/enterprise'
import type { Order } from '../Entities/Order'

/**
 * 訂單 Repository 契約
 */
export interface IOrderRepository extends Omit<Repository<Order, string>, 'findAll'> {
  /**
   * 根據會員 ID 查找訂單
   */
  findByUserId(userId: string): Promise<Order[]>

  /**
   * 根據冪等性鑰匙查找訂單
   */
  findByIdempotencyKey(key: string): Promise<Order | null>

  /**
   * 查找所有訂單（支援分頁）
   */
  findAll(filters?: {
    status?: string
    memberId?: string
    limit?: number
    offset?: number
  }): Promise<{ items: Order[]; total: number }>
}
