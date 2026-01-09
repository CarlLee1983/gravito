import { type Container, ServiceProvider } from '@gravito/core'
import { AdminListProducts } from './Application/UseCases/AdminListProducts'
import { RecoverStock } from './Application/UseCases/RecoverStock'
import { AtlasProductRepository } from './Infrastructure/Persistence/AtlasProductRepository'
import { AdminProductController } from './Interface/Http/Controllers/AdminProductController'

export class CatalogServiceProvider extends ServiceProvider {
  register(container: Container): void {
    container.singleton('catalog.repository.product', () => new AtlasProductRepository())
    container.singleton('catalog.stock.recover', () => new RecoverStock())
    container.bind(
      'catalog.usecase.adminListProducts',
      () => new AdminListProducts(container.make('catalog.repository.product'))
    )
    container.singleton(
      'catalog.controller.adminProduct',
      () => new AdminProductController(this.core!)
    )
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🛰️ Satellite Catalog is operational')

    const adminProductCtrl = core.container.make<AdminProductController>(
      'catalog.controller.adminProduct'
    )

    // 管理端 API
    core.router.prefix('/api/admin/v1/catalog').group((router) => {
      router.get('/products', (ctx) => adminProductCtrl.index(ctx))
      router.patch('/products/:id', (ctx) => adminProductCtrl.update(ctx))
    })

    /**
     * GASS 聯動：監聽退款成功，自動恢復庫存
     */
    core.hooks.addAction(
      'payment:refund:succeeded',
      async (payload: { orderId: string; items: any[] }) => {
        const recoverStock = core.container.make<RecoverStock>('catalog.stock.recover')

        try {
          // payload.items 應包含變體 ID 與數量
          for (const item of payload.items) {
            await recoverStock.execute({
              variantId: item.variantId,
              quantity: item.quantity,
            })
          }
          core.logger.info(`[Catalog] Inventory closure completed for order: ${payload.orderId}`)
        } catch (error: any) {
          core.logger.error(`[Catalog] Failed to recover stock: ${error.message}`)
        }
      }
    )
  }
}
