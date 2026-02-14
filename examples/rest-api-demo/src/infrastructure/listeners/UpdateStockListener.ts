/**
 * 更新庫存監聽器
 * 監聽 order:created 事件，扣減商品庫存
 */
import type { OrderCreated } from '../../domain/order/events/OrderCreated'

export class UpdateStockListener {
  async handle(event: OrderCreated): Promise<void> {
    const { orderId } = event.payload

    // 模擬更新庫存
    console.log(`[Inventory] 處理訂單 ${orderId} 的庫存扣減...`)

    // 在實際應用中，這裡應該調用庫存服務
    // for (const item of order.items) {
    //   await this.productRepository.decreaseStock(item.productId, item.quantity)
    // }

    console.log(`[Inventory] ✅ 訂單 ${orderId} 的庫存已更新`)
  }

  static get events(): string[] {
    return ['order:created']
  }
}
