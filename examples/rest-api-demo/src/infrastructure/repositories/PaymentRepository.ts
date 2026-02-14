/**
 * Payment Repository Contract
 *
 * 定義支付資料訪問的介面
 */

import type {
  CompletePaymentInput,
  InitiatePaymentInput,
  Payment,
  RefundPaymentInput,
} from '@domain/payment/Payment'

export interface PaymentRepository {
  /**
   * 根據 ID 獲取支付記錄
   */
  findById(id: string): Promise<Payment | null>

  /**
   * 根據訂單 ID 獲取支付記錄
   */
  findByOrderId(orderId: string): Promise<Payment | null>

  /**
   * 根據交易 ID 獲取支付記錄
   */
  findByTransactionId(transactionId: string): Promise<Payment | null>

  /**
   * 獲取用戶的支付記錄（分頁）
   */
  findByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    data: Payment[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 按狀態獲取支付記錄（分頁）
   */
  findByStatus(
    status: string,
    page: number,
    limit: number
  ): Promise<{
    data: Payment[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 獲取所有支付記錄（分頁）
   */
  findAll(
    page: number,
    limit: number
  ): Promise<{
    data: Payment[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 創建支付記錄
   */
  create(input: InitiatePaymentInput): Promise<Payment>

  /**
   * 完成支付
   */
  complete(id: string, input: CompletePaymentInput): Promise<Payment | null>

  /**
   * 標記支付失敗
   */
  markFailed(id: string, failureReason: string): Promise<Payment | null>

  /**
   * 進行退款
   */
  refund(id: string, input: RefundPaymentInput): Promise<Payment | null>

  /**
   * 刪除支付記錄
   */
  delete(id: string): Promise<boolean>

  /**
   * 獲取支付總數
   */
  count(): Promise<number>

  /**
   * 按日期範圍獲取支付記錄
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number
  ): Promise<{
    data: Payment[]
    total: number
    page: number
    limit: number
  }>

  /**
   * 獲取成功支付的總額
   */
  getTotalCompletedAmount(): Promise<number>

  /**
   * 獲取待處理支付
   */
  findPending(): Promise<Payment[]>

  /**
   * 重試失敗的支付
   */
  retryFailed(id: string): Promise<Payment | null>
}
