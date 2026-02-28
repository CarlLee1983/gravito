/**
 * 支付成功事件
 */

import { DomainEvent } from '@gravito/enterprise'

export class PaymentSucceeded extends DomainEvent {
  public readonly orderId: string
  public readonly paymentId: string
  public readonly amount: number

  constructor(orderId: string, paymentId: string, amount: number) {
    super()
    this.orderId = orderId
    this.paymentId = paymentId
    this.amount = amount
  }

  get aggregateId(): string {
    return this.orderId
  }
}
