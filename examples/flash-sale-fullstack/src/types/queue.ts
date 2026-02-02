/**
 * Queue Job Payload Types
 *
 * 隊列 Job 的共享類型定義
 * 注意：只傳遞 ID，不傳遞完整對象，避免序列化問題
 */

/**
 * 鎖定庫存 Job 的 Payload
 */
export interface LockInventoryJobPayload {
  orderId: string
  lockId: string
  productId: string
  quantity: number
  lockVersion: number
}

/**
 * 扣減庫存 Job 的 Payload
 */
export interface DeductInventoryJobPayload {
  orderId: string
  lockId: string
  productId: string
  quantity: number
  lockVersion: number
}

/**
 * 確認訂單 Job 的 Payload
 */
export interface ConfirmOrderJobPayload {
  orderId: string
  lockId: string
}

/**
 * 釋放庫存 Job 的 Payload（補償邏輯）
 */
export interface ReleaseInventoryJobPayload {
  orderId: string
  lockId: string
  productId: string
  quantity: number
  reason: 'deduction_failed' | 'manual' | 'expired'
}
