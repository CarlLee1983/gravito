/**
 * 事件服務提供者
 * 註冊所有事件監聽器到 IoC 容器
 */

import type { Container } from '@gravito/core'
import { type PlanetCore, ServiceProvider } from '@gravito/core'
import { getLogger } from '@infrastructure/logging/Logger'
import type { OrderCreated } from '../domain/order/events/OrderCreated'
import type { OrderStatusChanged } from '../domain/order/events/OrderStatusChanged'
import type { PaymentCompleted } from '../domain/payment/events/PaymentCompleted'
import type { ProductUpdated } from '../domain/product/events/ProductUpdated'
import type { UserCreated } from '../domain/user/events/UserCreated'
import { InvalidateCacheListener } from '../infrastructure/listeners/InvalidateCacheListener'
import { ProcessPaymentListener } from '../infrastructure/listeners/ProcessPaymentListener'
import { SendWelcomeEmailListener } from '../infrastructure/listeners/SendWelcomeEmailListener'
import { UpdateStockListener } from '../infrastructure/listeners/UpdateStockListener'

/**
 * 領域事件接口
 */
export interface DomainEvent {
  eventName: string
  payload: Record<string, unknown>
  timestamp?: Date
}

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
    const eventManager = core.events as unknown as {
      listen: (eventName: string, handler: (event: DomainEvent) => Promise<void>) => void
    }

    // =========================================================================
    // 1. 註冊用戶事件監聽器
    // =========================================================================
    const welcomeEmailListener = core.container.make<SendWelcomeEmailListener>(
      'SendWelcomeEmailListener'
    )
    eventManager.listen('user:created', async (event: DomainEvent) => {
      await welcomeEmailListener.handle(event as unknown as UserCreated)
    })

    // =========================================================================
    // 2. 註冊訂單事件監聽器
    // =========================================================================
    const updateStockListener = core.container.make<UpdateStockListener>('UpdateStockListener')
    eventManager.listen('order:created', async (event: DomainEvent) => {
      await updateStockListener.handle(event as unknown as OrderCreated)
    })

    const processPaymentListener =
      core.container.make<ProcessPaymentListener>('ProcessPaymentListener')
    eventManager.listen('order:created', async (event: DomainEvent) => {
      await processPaymentListener.handle(event as unknown as OrderCreated)
    })

    // =========================================================================
    // 3. 註冊快取失效監聽器
    // =========================================================================
    const invalidateCacheListener =
      core.container.make<InvalidateCacheListener>('InvalidateCacheListener')
    eventManager.listen('product:updated', async (event: DomainEvent) => {
      await invalidateCacheListener.handleProductUpdated(event as unknown as ProductUpdated)
    })
    eventManager.listen('order:status_changed', async (event: DomainEvent) => {
      await invalidateCacheListener.handleOrderStatusChanged(event as unknown as OrderStatusChanged)
    })
    eventManager.listen('payment:completed', async (event: DomainEvent) => {
      await invalidateCacheListener.handlePaymentCompleted(event as unknown as PaymentCompleted)
    })

    const logger = getLogger()
    logger.info('[Events] 事件系統已初始化', {
      listeners: 4,
      events: 6,
    })
  }
}
