/**
 * 訂單建立事件
 * 當新訂單成功建立時發送
 */
import { Event } from '@gravito/core'

export interface OrderCreatedPayload {
  orderId: string
  userId: string
  totalAmount: number
  itemCount: number
  shippingAddress: {
    email: string
    phone: string
    address: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  createdAt: Date
}

export class OrderCreated extends Event {
  readonly eventName = 'order:created'

  constructor(public readonly payload: OrderCreatedPayload) {
    super()
  }
}
