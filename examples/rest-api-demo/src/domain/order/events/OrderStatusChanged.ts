/**
 * 訂單狀態變更事件
 * 當訂單狀態被修改時發送
 */
import { Event } from '@gravito/core'

export interface OrderStatusChangedPayload {
  orderId: string
  userId: string
  previousStatus: string
  newStatus: string
  changedAt: Date
  reason?: string
}

export class OrderStatusChanged extends Event {
  readonly eventName = 'order:status_changed'

  constructor(public readonly payload: OrderStatusChangedPayload) {
    super()
  }
}
