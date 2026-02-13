/**
 * 支付退款事件
 * 當支付被成功退款時發送
 */
import { Event } from '@gravito/core'

export interface PaymentRefundedPayload {
  paymentId: string
  orderId: string
  userId: string
  refundAmount: number
  originalAmount: number
  reason: string
  refundedAt: Date
}

export class PaymentRefunded extends Event {
  readonly eventName = 'payment:refunded'

  constructor(public readonly payload: PaymentRefundedPayload) {
    super()
  }
}
