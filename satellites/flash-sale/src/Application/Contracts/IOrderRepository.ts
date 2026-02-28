/**
 * 訂單 Repository 合約（Application 層 - 舊版，向後相容）
 *
 * 此介面保留用於 CacheWarmupService 等既有基礎設施服務。
 * 新程式碼應使用 Domain/Contracts/IOrderRepository。
 */

import type { OrderStatus } from '../../Domain/Models'

/**
 * 舊版 Order 介面（用於向後相容）
 */
export interface LegacyOrder {
  id: string
  userId: string
  status: OrderStatus
  items: Array<{
    id: string
    orderId: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  totalAmount: number
  paymentMethod?: string
  paymentId?: string
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  confirmedAt?: Date
}

/**
 * 訂單 Repository 介面（Application 層 - 舊版）
 */
export interface IOrderRepository {
  findById(id: string): Promise<LegacyOrder | null>
  findByUserId(
    userId: string,
    options?: {
      status?: OrderStatus
      page?: number
      limit?: number
    }
  ): Promise<{
    items: LegacyOrder[]
    total: number
    page: number
    limit: number
  }>
  create(data: Omit<LegacyOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<LegacyOrder>
  update(id: string, data: Partial<LegacyOrder>): Promise<LegacyOrder>
  updateStatus(id: string, status: OrderStatus): Promise<LegacyOrder>
  delete(id: string): Promise<void>
  findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<LegacyOrder[]>
}
