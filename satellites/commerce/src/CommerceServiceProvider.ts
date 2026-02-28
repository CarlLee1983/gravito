/**
 * Commerce Service Provider
 *
 * 註冊訂單管理系統的所有服務、Repository 與事件監聽
 */

import type { Container } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { RewardSubscriber } from './Application/Subscribers/RewardSubscriber'
import { AdminListOrders } from './Application/UseCases/AdminListOrders'
import { ConfirmOrder } from './Application/UseCases/ConfirmOrder'
import { PlaceOrder } from './Application/UseCases/PlaceOrder'
import { RequestRefund } from './Application/UseCases/RequestRefund'
import type { IOrderRepository } from './Domain/Contracts/IOrderRepository'
import { AtlasOrderRepository } from './Infrastructure/Repositories/AtlasOrderRepository'

/**
 * commerce:order-placed 事件 payload 型別
 */
interface OrderPlacedPayload {
  orderId: string
  memberId?: string | null
  totalAmount?: number
  currency?: string
  items?: Array<{ variantId: string; quantity: number }>
}

/**
 * CommerceServiceProvider
 *
 * 負責：
 * 1. 訂單 Repository 註冊
 * 2. UseCase 註冊（DI 容器）
 * 3. 事件監聽掛載
 * 4. HTTP 路由設定（由 Controller 負責）
 */
export class CommerceServiceProvider extends ServiceProvider {
  /**
   * 註冊階段
   *
   * 註冊所有服務到 IoC 容器
   */
  register(_container: Container): void {
    const container = _container

    // 1. 註冊 Repository
    container.singleton('commerce.repo.order', () => {
      return new AtlasOrderRepository()
    })

    // 2. 註冊 UseCase
    container.singleton('commerce.usecase.placeOrder', (c) => {
      const orderRepo = c.make<IOrderRepository>('commerce.repo.order')
      const core = this.core!
      return new PlaceOrder(core, orderRepo)
    })

    container.singleton('commerce.usecase.confirmOrder', (c) => {
      const orderRepo = c.make<IOrderRepository>('commerce.repo.order')
      const core = this.core!
      return new ConfirmOrder(core, orderRepo)
    })

    container.singleton('commerce.usecase.requestRefund', (c) => {
      const orderRepo = c.make<IOrderRepository>('commerce.repo.order')
      const core = this.core!
      return new RequestRefund(core, orderRepo)
    })

    container.singleton('commerce.usecase.adminListOrders', (c) => {
      const orderRepo = c.make<IOrderRepository>('commerce.repo.order')
      return new AdminListOrders(orderRepo)
    })
  }

  /**
   * 啟動階段
   *
   * 設定事件監聽、路由等
   */
  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🛰️ Satellite Commerce 啟動中...')

    // 1. 掛載事件監聽
    const rewardSubscriber = new RewardSubscriber(core)

    // 監聽訂單已建立事件（用於分配紅利）
    core.hooks.addAction('commerce:order-placed', async (payload: OrderPlacedPayload) => {
      await rewardSubscriber.handleOrderPlaced({ orderId: payload.orderId })
    })

    // 2. 其他 Satellite 可透過 Hook 監聽以下事件：
    //    - commerce:order-placed     → 觸發庫存扣減（Catalog）、紅利分配（Rewards）
    //    - commerce:order-confirmed  → 訂單確認事件
    //    - commerce:order-refund-requested → 退款申請事件
    //    - commerce:order-refunded   → 退款完成事件

    // 3. HTTP 路由設定（由 Controllers 在 Interface/Http 層負責）
    // 路由範例：
    // POST   /api/checkout          → PlaceOrder UseCase
    // POST   /api/orders/:id/confirm → ConfirmOrder UseCase
    // POST   /api/orders/:id/refund  → RequestRefund UseCase
    // GET    /api/admin/orders       → AdminListOrders UseCase

    core.logger.info('✅ Satellite Commerce 啟動完成')
  }
}
