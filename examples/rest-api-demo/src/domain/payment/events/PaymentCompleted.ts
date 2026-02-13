/**
 * 支付完成事件
 * 當支付成功處理時發送
 */
import { Event } from '@gravito/core'

export interface PaymentCompletedPayload {
  paymentId: string
  orderId: string
  userId: string
  amount: number
  currency: string
  paymentMethod: string
  transactionId: string
  completedAt: Date
}

export class PaymentCompleted extends Event {
  readonly eventName = 'payment:completed'

  constructor(public readonly payload: PaymentCompletedPayload) {
    super()
  }
}
