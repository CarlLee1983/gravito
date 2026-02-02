/**
 * 查詢訂單 Use Case
 */

import type { IOrderRepository } from '../Contracts/IOrderRepository'
import type { Order } from '../../Domain/Models'

/**
 * GetOrder Use Case
 *
 * 根據訂單 ID 查詢訂單詳情
 */
export class GetOrder {
  constructor(private repository: IOrderRepository) {}

  /**
   * 執行 Use Case
   */
  async execute(orderId: string): Promise<Order | null> {
    if (!orderId?.trim()) {
      throw new Error('Order ID is required')
    }

    return this.repository.findById(orderId)
  }
}
