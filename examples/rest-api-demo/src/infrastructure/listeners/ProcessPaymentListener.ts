/**
 * 處理支付監聽器
 * 監聽 order:created 事件，自動啟動支付流程
 */
import type { OrderCreated } from '../../domain/order/events/OrderCreated'

export class ProcessPaymentListener {
  async handle(event: OrderCreated): Promise<void> {
    const { orderId, totalAmount } = event.payload

    // 模擬啟動支付流程
    console.log(`[Payment] 啟動訂單 ${orderId} 的支付流程... (金額: ${totalAmount})`)

    // 在實際應用中，這裡應該調用支付服務
    // const paymentId = await this.paymentService.initiate({
    //   orderId,
    //   userId,
    //   amount: totalAmount,
    //   paymentMethod: 'credit_card'
    // })

    console.log(`[Payment] ✅ 訂單 ${orderId} 支付流程已啟動`)
  }

  static get events(): string[] {
    return ['order:created']
  }
}
