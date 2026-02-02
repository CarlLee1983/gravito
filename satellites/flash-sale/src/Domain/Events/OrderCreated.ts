/**
 * 訂單已建立事件
 *
 * 當訂單成功建立時發送此事件
 */

import { Event } from '@gravito/core'
import type { Order } from '../Models'

export class OrderCreated extends Event {
  constructor(public order: Order) {
    super()
  }
}
