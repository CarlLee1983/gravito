/**
 * 事件服務提供者
 * 註冊所有事件監聽器到 IoC 容器
 */

import { type Container, type EventManager, ServiceProvider } from '@gravito/core'
import { InvalidateCacheListener } from '../infrastructure/listeners/InvalidateCacheListener'
import { ProcessPaymentListener } from '../infrastructure/listeners/ProcessPaymentListener'
import { SendWelcomeEmailListener } from '../infrastructure/listeners/SendWelcomeEmailListener'
import { UpdateStockListener } from '../infrastructure/listeners/UpdateStockListener'

export class EventServiceProvider extends ServiceProvider {
  /**
   * 註冊事件監聽器
   */
  register(): void {
    // 註冊監聽器到容器
    this.app.singleton(SendWelcomeEmailListener)
    this.app.singleton(UpdateStockListener)
    this.app.singleton(ProcessPaymentListener)
    this.app.singleton(InvalidateCacheListener)
  }

  /**
   * 啟動事件系統
   */
  async boot(): Promise<void> {
    // 從容器中獲取事件管理器
    const eventManager = this.app.make<EventManager>('events')

    // =========================================================================
    // 1. 註冊用戶事件監聽器
    // =========================================================================
    const welcomeEmailListener = this.app.make(SendWelcomeEmailListener)
    eventManager.listen('user:created', async (event) => {
      await welcomeEmailListener.handle(event)
    })

    // =========================================================================
    // 2. 註冊訂單事件監聽器
    // =========================================================================
    const updateStockListener = this.app.make(UpdateStockListener)
    eventManager.listen('order:created', async (event) => {
      await updateStockListener.handle(event)
    })

    const processPaymentListener = this.app.make(ProcessPaymentListener)
    eventManager.listen('order:created', async (event) => {
      await processPaymentListener.handle(event)
    })

    // =========================================================================
    // 3. 註冊快取失效監聽器
    // =========================================================================
    const invalidateCacheListener = this.app.make(InvalidateCacheListener)
    eventManager.listen('product:updated', async (event) => {
      await invalidateCacheListener.handleProductUpdated(event)
    })
    eventManager.listen('order:status_changed', async (event) => {
      await invalidateCacheListener.handleOrderStatusChanged(event)
    })
    eventManager.listen('payment:completed', async (event) => {
      await invalidateCacheListener.handlePaymentCompleted(event)
    })

    console.log('[Events] ✅ 事件系統已初始化')
    console.log('[Events] - 已註冊 4 個監聽器')
    console.log('[Events] - 監聽 6 個事件型別')
  }
}
