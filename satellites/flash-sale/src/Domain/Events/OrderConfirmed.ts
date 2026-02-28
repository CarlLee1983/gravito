/**
 * 訂單已確認事件
 */

import { DomainEvent } from '@gravito/enterprise'

export class OrderConfirmed extends DomainEvent {
  public readonly orderId: string

  constructor(orderId: string) {
    super()
    this.orderId = orderId
  }

  get aggregateId(): string {
    return this.orderId
  }
}
