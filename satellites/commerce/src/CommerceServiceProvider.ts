/**
 * Commerce Service Provider
 *
 * 註冊訂單管理系統的所有服務與事件監聽
 */

import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'

/**
 * CommerceServiceProvider
 *
 * 負責：
 * 1. 訂單生命週期管理
 * 2. 庫存扣減協調
 * 3. 跨 Satellite 事件通訊
 */
export class CommerceServiceProvider extends ServiceProvider {
  /**
   * 註冊階段
   */
  register(container: Container): void {
    // TODO: 當 Repository 實現時解開註解
    // container.singleton('order.repository', () => {
    //   return new AtlasOrderRepository()
    // })

    // TODO: 註冊 Use Cases
    // container.bind('commerce.usecase.deductInventory', (c) => {
    //   return new DeductInventory(this.core!)
    // })
  }

  /**
   * 啟動階段
   */
  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🛰️ Satellite Commerce is booting')

    // 監聽支付成功事件（來自 Payment Satellite）
    // core.hooks.addAction('payment:succeeded', async (orderId: string, amount: number) => {
    //   core.logger.info(`[Commerce] Payment succeeded for order ${orderId}`)
    //   // 執行庫存扣減
    //   // 更新訂單狀態
    // })

    // 監聽訂單建立事件（來自 Flash-Sale Satellite）
    // core.events.listen(OrderCreated, async (event: OrderCreated) => {
    //   core.logger.info(`[Commerce] Order created: ${event.order.id}`)
    //   // 記錄訂單事件
    // })

    core.logger.info('✅ Satellite Commerce booted successfully')
  }
}
