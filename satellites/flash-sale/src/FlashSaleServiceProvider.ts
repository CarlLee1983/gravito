/**
 * Flash Sale Service Provider
 *
 * 註冊搶購系統的所有服務與路由
 */

import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { ProductController } from './Interface/Http/Controllers/ProductController'
import { OrderController } from './Interface/Http/Controllers/OrderController'

/**
 * FlashSaleServiceProvider
 *
 * 負責在 Gravito 應用中註冊搶購系統的所有組件
 */
export class FlashSaleServiceProvider extends ServiceProvider {
  /**
   * 註冊階段：綁定服務到容器
   *
   * 此階段應只註冊依賴注入的綁定，不應執行任何初始化邏輯
   */
  register(container: Container): void {
    // TODO: 當 Repository 實現時解開註解
    // container.singleton('product.repository', () => {
    //   return new AtlasProductRepository()
    // })

    // container.singleton('order.repository', () => {
    //   return new AtlasOrderRepository()
    // })

    // 暫時：註冊控制器（供 boot 階段使用）
    // 實際應在 boot 階段動態註冊
  }

  /**
   * 啟動階段：初始化服務、註冊路由、監聽事件
   *
   * 此階段應執行所有初始化邏輯
   */
  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    // 記錄啟動訊息
    core.logger.info('🛰️ Satellite Flash-Sale is booting')

    // TODO: 註冊路由
    // 目前需要手動在主應用中註冊
    // core.router.prefix('/api').group((router) => {
    //   router.get('/products', (ctx) => productCtrl.index(ctx))
    //   router.get('/products/:id', (ctx) => productCtrl.show(ctx))
    //   router.post('/orders', (ctx) => orderCtrl.store(ctx))
    //   router.get('/orders/:id', (ctx) => orderCtrl.show(ctx))
    //   router.get('/orders', (ctx) => orderCtrl.list(ctx))
    // })

    // TODO: 監聽事件
    // core.events.listen(OrderCreated, async (event: OrderCreated) => {
    //   core.logger.info(`Order created: ${event.order.id}`)
    //   // 發送庫存鎖定請求
    //   // 發送支付請求
    // })

    core.logger.info('✅ Satellite Flash-Sale booted successfully')
  }
}
