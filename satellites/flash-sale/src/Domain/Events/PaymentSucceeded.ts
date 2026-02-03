/**
 * 支付成功事件
 */

import { Event } from '@gravito/core'

export class PaymentSucceeded extends Event {
  constructor(
    public orderId: string,
    public paymentId: string,
    public amount: number
  ) {
    super()
  }
}
