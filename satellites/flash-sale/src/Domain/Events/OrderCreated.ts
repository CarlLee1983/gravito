/**
 * 訂單已建立事件
 *
 * 當訂單成功建立時發送此事件
 */

import { DomainEvent } from '@gravito/enterprise'
import type { Order } from '../Entities/Order'

export class OrderCreated extends DomainEvent {
  public readonly order: Order

  constructor(order: Order) {
    super()
    this.order = order
  }

  get aggregateId(): string {
    return this.order.id
  }
}
