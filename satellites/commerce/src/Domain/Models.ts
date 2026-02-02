/**
 * Commerce Satellite 領域模型
 *
 * 專注於訂單的狀態管理與庫存扣減流程
 */

/**
 * 庫存扣減請求
 *
 * 當支付成功時，Commerce 會發送此請求到 Flash-Sale Satellite
 * 來扣減庫存
 */
export class DeductInventoryRequest {
  constructor(
    public orderId: string,
    public productId: string,
    public quantity: number
  ) {}

  validate(): string[] {
    const errors: string[] = []

    if (!this.orderId?.trim()) {
      errors.push('orderId is required')
    }

    if (!this.productId?.trim()) {
      errors.push('productId is required')
    }

    if (this.quantity <= 0) {
      errors.push('quantity must be greater than 0')
    }

    return errors
  }
}

/**
 * 訂單狀態轉移事件
 */
export interface OrderStatusTransition {
  orderId: string
  fromStatus: string
  toStatus: string
  reason?: string
  timestamp: Date
}

/**
 * 訂單確認請求
 *
 * 當庫存扣減成功時，Commerce 會建立訂單確認
 */
export class ConfirmOrderRequest {
  constructor(
    public orderId: string,
    public inventoryLockId?: string
  ) {}

  validate(): string[] {
    const errors: string[] = []

    if (!this.orderId?.trim()) {
      errors.push('orderId is required')
    }

    return errors
  }
}

/**
 * 訂單退款請求
 */
export class RefundOrderRequest {
  constructor(
    public orderId: string,
    public reason: string,
    public restoreInventory: boolean = true
  ) {}

  validate(): string[] {
    const errors: string[] = []

    if (!this.orderId?.trim()) {
      errors.push('orderId is required')
    }

    if (!this.reason?.trim()) {
      errors.push('reason is required')
    }

    return errors
  }
}
