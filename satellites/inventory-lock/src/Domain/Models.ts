/**
 * Inventory-Lock Satellite 領域模型
 *
 * 專注於高併發場景下的庫存鎖定與管理
 */

import { Event } from '@gravito/core'

/**
 * 鎖定狀態
 */
export enum LockStatus {
  LOCKED = 'LOCKED', // 已鎖定
  RELEASED = 'RELEASED', // 已釋放
  EXPIRED = 'EXPIRED', // 已過期
  DEADLOCK = 'DEADLOCK', // 死鎖偵測
}

/**
 * 庫存鎖定模型
 *
 * 表示對特定商品的庫存鎖定
 */
export interface InventoryLock {
  id: string
  productId: string
  userId: string
  orderId: string
  quantity: number
  status: LockStatus
  lockedAt: Date
  expiresAt: Date
  releasedAt?: Date
  version: number // 樂觀鎖版本
}

/**
 * 建立鎖定請求
 */
export class LockInventoryRequest {
  constructor(
    public productId: string,
    public userId: string,
    public orderId: string,
    public quantity: number,
    public timeoutSeconds = 900 // 15 分鐘
  ) {}

  validate(): string[] {
    const errors: string[] = []

    if (!this.productId?.trim()) {
      errors.push('productId is required')
    }

    if (!this.userId?.trim()) {
      errors.push('userId is required')
    }

    if (!this.orderId?.trim()) {
      errors.push('orderId is required')
    }

    if (this.quantity <= 0) {
      errors.push('quantity must be greater than 0')
    }

    if (this.timeoutSeconds <= 0) {
      errors.push('timeoutSeconds must be greater than 0')
    }

    return errors
  }
}

/**
 * 釋放鎖定請求
 */
export class ReleaseLockRequest {
  constructor(
    public lockId: string,
    public reason = 'Normal release'
  ) {}

  validate(): string[] {
    const errors: string[] = []

    if (!this.lockId?.trim()) {
      errors.push('lockId is required')
    }

    if (!this.reason?.trim()) {
      errors.push('reason is required')
    }

    return errors
  }
}

/**
 * 庫存鎖定事件
 */
export class InventoryLocked extends Event {
  constructor(
    public lockId: string,
    public productId: string,
    public quantity: number,
    public expiresAt: Date
  ) {
    super()
  }
}

/**
 * 庫存已釋放事件
 */
export class InventoryReleased extends Event {
  constructor(
    public lockId: string,
    public productId: string,
    public quantity: number,
    public reason: string
  ) {
    super()
  }
}

/**
 * 庫存已扣減事件
 */
export class InventoryDeducted extends Event {
  constructor(
    public orderId: string,
    public productId: string,
    public quantity: number,
    public success: boolean
  ) {
    super()
  }
}

/**
 * 鎖定失敗事件（庫存不足）
 */
export class LockFailed extends Event {
  constructor(
    public productId: string,
    public requestedQuantity: number,
    public availableQuantity: number,
    public reason: string
  ) {
    super()
  }
}
