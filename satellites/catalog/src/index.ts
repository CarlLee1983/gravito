import { type Container, ServiceProvider } from '@gravito/core'
import { AdminListProducts } from './Application/UseCases/AdminListProducts'
import { CreateCategory } from './Application/UseCases/CreateCategory'
import { CreateProduct } from './Application/UseCases/CreateProduct'
import { DeleteCategory } from './Application/UseCases/DeleteCategory'
import { DeleteProduct } from './Application/UseCases/DeleteProduct'
import { GetProduct } from './Application/UseCases/GetProduct'
import { RecoverStock } from './Application/UseCases/RecoverStock'
import { UpdateCategory } from './Application/UseCases/UpdateCategory'
import { UpdateProduct } from './Application/UseCases/UpdateProduct'
import { AtlasCategoryRepository } from './Infrastructure/Persistence/AtlasCategoryRepository'
import { AtlasProductRepository } from './Infrastructure/Persistence/AtlasProductRepository'
import { AdminProductController } from './Interface/Http/Controllers/AdminProductController'

export class CatalogServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // Repositories
    container.singleton('catalog.repository.product', () => new AtlasProductRepository())
    container.singleton('catalog.repository.category', () => new AtlasCategoryRepository())

    // UseCases - Product
    container.bind(
      'catalog.usecase.createProduct',
      () => new CreateProduct(container.make('catalog.repository.product'), this.core!)
    )
    container.bind(
      'catalog.usecase.getProduct',
      () => new GetProduct(container.make('catalog.repository.product'))
    )
    container.bind(
      'catalog.usecase.updateProduct',
      () => new UpdateProduct(container.make('catalog.repository.product'))
    )
    container.bind(
      'catalog.usecase.deleteProduct',
      () => new DeleteProduct(container.make('catalog.repository.product'))
    )
    container.bind(
      'catalog.usecase.adminListProducts',
      () => new AdminListProducts(container.make('catalog.repository.product'))
    )

    // UseCases - Category
    container.bind(
      'catalog.usecase.createCategory',
      () => new CreateCategory(container.make('catalog.repository.category'), this.core!)
    )
    container.bind(
      'catalog.usecase.updateCategory',
      () => new UpdateCategory(container.make('catalog.repository.category'), this.core!)
    )
    container.bind(
      'catalog.usecase.deleteCategory',
      () => new DeleteCategory(container.make('catalog.repository.category'), this.core!)
    )

    // Stock Management
    container.singleton(
      'catalog.stock.recover',
      () => new RecoverStock(container.make('catalog.repository.product'))
    )

    // Controllers
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
      router.get('/products/:id', (ctx) => adminProductCtrl.show(ctx))
      router.post('/products', (ctx) => adminProductCtrl.store(ctx))
      router.patch('/products/:id', (ctx) => adminProductCtrl.update(ctx))
      router.delete('/products/:id', (ctx) => adminProductCtrl.destroy(ctx))
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
