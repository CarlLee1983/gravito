/**
 * Order Repository Contract
 *
 * 定義訂單資料訪問的介面
 */

import type { CreateOrderInput, Order, UpdateOrderStatusInput } from '@domain/order/Order'

export interface OrderRepository {
  /**
   * 根據 ID 獲取訂單
   */
  findById(id: string): Promise<Order | null>

  /**
   * 根據訂單編號獲取訂單
   */
  findByOrderNumber(orderNumber: string): Promise<Order | null>

  /**
   * 獲取用戶的訂單（分頁）
   */
  findByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    data: Order[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 按狀態獲取訂單（分頁）
   */
  findByStatus(
    status: string,
    page: number,
    limit: number
  ): Promise<{
    data: Order[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 獲取所有訂單（分頁）
   */
  findAll(
    page: number,
    limit: number
  ): Promise<{
    data: Order[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 創建新訂單
   */
  create(input: CreateOrderInput): Promise<Order>

  /**
   * 更新訂單狀態
   */
  updateStatus(id: string, input: UpdateOrderStatusInput): Promise<Order | null>

  /**
   * 更新訂單
   */
  update(id: string, input: Partial<Order>): Promise<Order | null>

  /**
   * 刪除訂單
   */
  delete(id: string): Promise<boolean>

  /**
   * 獲取訂單總數
   */
  count(): Promise<number>

  /**
   * 獲取用戶的訂單總數
   */
  countByUserId(userId: string): Promise<number>

  /**
   * 按日期範圍獲取訂單
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number
  ): Promise<{
    data: Order[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 獲取待處理訂單
   */
  findPending(): Promise<Order[]>

  /**
   * 獲取運中訂單
   */
  findShipped(): Promise<Order[]>

  /**
   * 計算用戶總消費金額
   */
  getUserTotalSpent(userId: string): Promise<number>

  /**
   * 計算用戶訂單總數
   */
  getUserOrderCount(userId: string): Promise<number>
}
