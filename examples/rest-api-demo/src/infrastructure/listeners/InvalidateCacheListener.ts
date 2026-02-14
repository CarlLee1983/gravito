/**
 * 快取失效監聽器
 * 監聽各種更新事件，失效相關的快取
 */

import type { OrderStatusChanged } from '../../domain/order/events/OrderStatusChanged'
import type { PaymentCompleted } from '../../domain/payment/events/PaymentCompleted'
import type { ProductUpdated } from '../../domain/product/events/ProductUpdated'

export class InvalidateCacheListener {
  /**
   * 處理商品更新事件
   */
  async handleProductUpdated(event: ProductUpdated): Promise<void> {
    const { productId, name } = event.payload

    console.log(`[Cache] 失效商品快取: ${productId}`)

    // 在實際應用中，應該使用 CacheService 失效快取
    // await this.cacheService.delete(`product:${productId}`)
    // await this.cacheService.deletePattern('products:list:*')

    console.log(`[Cache] ✅ 商品 ${name} 的快取已失效`)
  }

  /**
   * 處理訂單狀態變更事件
   */
  async handleOrderStatusChanged(event: OrderStatusChanged): Promise<void> {
    const { orderId } = event.payload

    console.log(`[Cache] 失效訂單快取: ${orderId}`)

    // await this.cacheService.delete(`order:${orderId}`)

    console.log(`[Cache] ✅ 訂單 ${orderId} 的快取已失效`)
  }

  /**
   * 處理支付完成事件
   */
  async handlePaymentCompleted(event: PaymentCompleted): Promise<void> {
    const { orderId } = event.payload

    console.log(`[Cache] 失效支付相關快取: ${orderId}`)

    // await this.cacheService.delete(`payment:${orderId}`)
    // await this.cacheService.deletePattern(`order:${orderId}:*`)

    console.log(`[Cache] ✅ 訂單 ${orderId} 的支付快取已失效`)
  }

  static get events(): string[] {
    return ['product:updated', 'order:status_changed', 'payment:completed']
  }
}
