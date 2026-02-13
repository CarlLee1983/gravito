/**
 * 商品更新事件
 * 當商品資訊被修改時發送
 */
import { Event } from '@gravito/core'

export interface ProductUpdatedPayload {
  productId: string
  name: string
  price: number
  stock: number
  updatedAt: Date
  changes: Record<string, unknown>
}

export class ProductUpdated extends Event {
  readonly eventName = 'product:updated'

  constructor(public readonly payload: ProductUpdatedPayload) {
    super()
  }
}
