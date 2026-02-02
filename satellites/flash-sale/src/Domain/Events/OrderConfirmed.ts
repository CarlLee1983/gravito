/**
 * 訂單已確認事件
 */

import { Event } from '@gravito/core'

export class OrderConfirmed extends Event {
  constructor(public orderId: string) {
    super()
  }
}
