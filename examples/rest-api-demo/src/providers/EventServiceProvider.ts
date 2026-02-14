/**
 * 事件服務提供者
 * 註冊所有事件監聽器到 IoC 容器
 */

import type { Container } from '@gravito/core'
import { type PlanetCore, ServiceProvider } from '@gravito/core'
import { InvalidateCacheListener } from '../infrastructure/listeners/InvalidateCacheListener'
import { ProcessPaymentListener } from '../infrastructure/listeners/ProcessPaymentListener'
import { SendWelcomeEmailListener } from '../infrastructure/listeners/SendWelcomeEmailListener'
import { UpdateStockListener } from '../infrastructure/listeners/UpdateStockListener'

export class EventServiceProvider extends ServiceProvider {
  /**
   * 註冊事件監聽器
   */
  register(container: Container): void {
    // 註冊監聯器到容器
    container.singleton('SendWelcomeEmailListener', () => new SendWelcomeEmailListener())
    container.singleton('UpdateStockListener', () => new UpdateStockListener())
    container.singleton('ProcessPaymentListener', () => new ProcessPaymentListener())
    container.singleton('InvalidateCacheListener', () => new InvalidateCacheListener())
  }

  /**
   * 啟動事件系統
   */
  async boot(core: PlanetCore): Promise<void> {
    // 從容器中獲取事件管理器
    // 使用 any 因為 EventManager.listen 期望 Listener<Event> 而非內聯函數
    const eventManager = core.events as any

    // =========================================================================
    // 1. 註冊用戶事件監聽器
    // =========================================================================
    const welcomeEmailListener = core.container.make<SendWelcomeEmailListener>(
      'SendWelcomeEmailListener'
    )
    eventManager.listen('user:created', async (event: any) => {
      await welcomeEmailListener.handle(event)
    })

    // =========================================================================
    // 2. 註冊訂單事件監聽器
    // =========================================================================
    const updateStockListener = core.container.make<UpdateStockListener>('UpdateStockListener')
    eventManager.listen('order:created', async (event: any) => {
      await updateStockListener.handle(event)
    })

    const processPaymentListener =
      core.container.make<ProcessPaymentListener>('ProcessPaymentListener')
    eventManager.listen('order:created', async (event: any) => {
      await processPaymentListener.handle(event)
    })

    // =========================================================================
    // 3. 註冊快取失效監聽器
    // =========================================================================
    const invalidateCacheListener =
      core.container.make<InvalidateCacheListener>('InvalidateCacheListener')
    eventManager.listen('product:updated', async (event: any) => {
      await invalidateCacheListener.handleProductUpdated(event)
    })
    eventManager.listen('order:status_changed', async (event: any) => {
      await invalidateCacheListener.handleOrderStatusChanged(event)
    })
    eventManager.listen('payment:completed', async (event: any) => {
      await invalidateCacheListener.handlePaymentCompleted(event)
    })

    console.log('[Events] 事件系統已初始化')
    console.log('[Events] - 已註冊 4 個監聽器')
    console.log('[Events] - 監聽 6 個事件型別')
  }
}
