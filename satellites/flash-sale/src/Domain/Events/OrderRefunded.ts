/**
 * 訂單已退款事件
 */

import { DomainEvent } from '@gravito/enterprise'

export class OrderRefunded extends DomainEvent {
  public readonly orderId: string
  public readonly reason: string

  constructor(orderId: string, reason: string) {
    super()
    this.orderId = orderId
    this.reason = reason
  }

  get aggregateId(): string {
    return this.orderId
  }
}
