import { fileURLToPath } from 'node:url'
import type { Container, GravitoContext, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import {
  AddToCart,
  ClearCart,
  GetCart,
  MergeCart,
  RemoveFromCart,
  UpdateCartItem,
} from './Application/UseCases'
import {
  AddItemContext,
  GetCartContext,
  MergeCartContext,
  RemoveItemContext,
  UpdateItemContext,
} from './Domain/DCI/Contexts'
import { AtlasCartRepository } from './Infrastructure/Persistence/Repositories/AtlasCartRepository'
import { CartController } from './Interface/Http/Controllers/CartController'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export class CartServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 1. 綁定 Repository
    container.singleton('cart.repository', () => new AtlasCartRepository())

    // 2. 綁定 DCI Contexts
    container.singleton('cart.context.add-item', () => {
      return new AddItemContext(container.make('cart.repository'))
    })

    container.singleton('cart.context.remove-item', () => {
      return new RemoveItemContext(container.make('cart.repository'))
    })

    container.singleton('cart.context.update-item', () => {
      return new UpdateItemContext(container.make('cart.repository'))
    })

    container.singleton('cart.context.get-cart', () => {
      return new GetCartContext(container.make('cart.repository'))
    })

    container.singleton('cart.context.merge', () => {
      return new MergeCartContext(container.make('cart.repository'))
    })

    // 3. 綁定 UseCase
    container.singleton('cart.add-item', () => {
      return new AddToCart(container.make('cart.repository'))
    })

    container.singleton('cart.remove-item', () => {
      return new RemoveFromCart(container.make('cart.repository'))
    })

    container.singleton('cart.update-item', () => {
      return new UpdateCartItem(container.make('cart.repository'))
    })

    container.singleton('cart.clear', () => {
      return new ClearCart(container.make('cart.repository'))
    })

    container.singleton('cart.get', () => {
      return new GetCart(container.make('cart.repository'))
    })

    container.singleton('cart.merge', () => {
      return new MergeCart(container.make('cart.repository'))
    })
  }

  getMigrationsPath(): string {
    return `${__dirname}/Infrastructure/Persistence/Migrations`
  }

  override async boot(core: PlanetCore): Promise<void> {
    const cartCtrl = new CartController()

    // 1. 註冊購物車路由（完整 6 個端點）
    const cartGroup = core.router.prefix('/api/carts')
    cartGroup.get('/', (c: GravitoContext) => cartCtrl.show(c))
    cartGroup.post('/items', (c: GravitoContext) => cartCtrl.store(c))
    cartGroup.delete('/items/:variantId', (c: GravitoContext) => cartCtrl.destroy(c))
    cartGroup.patch('/items/:variantId', (c: GravitoContext) => cartCtrl.update(c))
    cartGroup.delete('/', (c: GravitoContext) => cartCtrl.clear(c))
    cartGroup.post('/merge', (c: GravitoContext) => cartCtrl.merge(c))

    // 2. 🏎️ 絲滑聯動點：監聽會員登入事件執行自動合併
    core.hooks.addAction(
      'member:logged-in',
      async (payload: { memberId?: string; guestId?: string }) => {
        if (payload.memberId && payload.guestId) {
          core.logger.info(`🔄 [Cart] 偵測到登入，正在合併訪客 (${payload.guestId}) 購物車...`)
          const merger = core.container.make<MergeCart>('cart.merge')
          await merger.execute({
            memberId: payload.memberId,
            guestId: payload.guestId,
          })
        }
      }
    )

    core.logger.info('🛰️ Satellite Cart is operational')
  }
}
