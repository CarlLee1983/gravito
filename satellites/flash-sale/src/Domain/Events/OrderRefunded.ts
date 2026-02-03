/**
 * 訂單已退款事件
 */

import { Event } from '@gravito/core'

export class OrderRefunded extends Event {
  constructor(
    public orderId: string,
    public reason: string
  ) {
    super()
  }
}
