/**
 * @gravito/satellite-ad
 *
 * 廣告管理與投放系統
 * 基於 DDD + DCI 架構，提供完整的廣告生命週期管理
 *
 * @packageDocumentation
 */

import { DB } from '@gravito/atlas'
import type { Container, PlanetCore, RouteHandler } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { CreateAdUseCase } from './Application/UseCases/CreateAdUseCase'
import { DeleteAdUseCase } from './Application/UseCases/DeleteAdUseCase'
import { DeliverAdUseCase } from './Application/UseCases/DeliverAdUseCase'
import { ListAdsUseCase } from './Application/UseCases/ListAdsUseCase'
import { ToggleAdStatusUseCase } from './Application/UseCases/ToggleAdStatusUseCase'
import { UpdateAdUseCase } from './Application/UseCases/UpdateAdUseCase'
import type { IAdRepository } from './Domain/Contracts/IAdRepository'
import { AdminAdController } from './Infrastructure/Http/Controllers/AdminAdController'
import { PublicAdController } from './Infrastructure/Http/Controllers/PublicAdController'
import { AtlasAdRepository } from './Infrastructure/Persistence/AtlasAdRepository'

// === Domain Layer ===

// Contracts
export type { IAdRepository } from './Domain/Contracts/IAdRepository'
export type { AdvertisementProps } from './Domain/Entities/Advertisement'
// Entities
export { AdStatus, Advertisement } from './Domain/Entities/Advertisement'
// Errors
export { AdError, AdErrorCode } from './Domain/Errors/AdError'
// ValueObjects
export { AdSchedule } from './Domain/ValueObjects/AdSchedule'
export { AdWeight } from './Domain/ValueObjects/AdWeight'
export { AdSlot, SlotSlug } from './Domain/ValueObjects/SlotSlug'

// === Application Layer ===

// DTOs
export type { AdDTO } from './Application/DTOs/AdDTO'
export { AdMapper } from './Application/DTOs/AdMapper'
export type { CreateAdInput } from './Application/UseCases/CreateAdUseCase'
// UseCases
export { CreateAdUseCase } from './Application/UseCases/CreateAdUseCase'
export { DeleteAdUseCase } from './Application/UseCases/DeleteAdUseCase'
export { DeliverAdUseCase } from './Application/UseCases/DeliverAdUseCase'
export { ListAdsUseCase } from './Application/UseCases/ListAdsUseCase'
export { ToggleAdStatusUseCase } from './Application/UseCases/ToggleAdStatusUseCase'
export { UpdateAdUseCase } from './Application/UseCases/UpdateAdUseCase'

// === Infrastructure Layer ===

// Controllers
export { AdminAdController } from './Infrastructure/Http/Controllers/AdminAdController'
export { PublicAdController } from './Infrastructure/Http/Controllers/PublicAdController'
export type { AdvertisementRow } from './Infrastructure/Persistence/AdDbTypes'
export {
  isAdvertisementRow,
  reconstituteAdvertisement,
} from './Infrastructure/Persistence/AdDbTypes'
// Persistence
export { AtlasAdRepository } from './Infrastructure/Persistence/AtlasAdRepository'

// === Service Provider ===

/**
 * AdServiceProvider
 *
 * 負責：
 * 1. Repository 註冊（Atlas ORM 實作）
 * 2. UseCase 註冊（DI 容器）
 * 3. Controller 註冊
 * 4. HTTP 路由設定
 */
export class AdServiceProvider extends ServiceProvider {
  /**
   * 註冊階段
   *
   * 註冊所有服務到 IoC 容器
   */
  register(container: Container): void {
    // 1. 註冊 Repository
    container.singleton('ad.repo.ad', () => {
      return new AtlasAdRepository(DB)
    })

    // 2. 註冊 UseCases
    container.singleton('ad.usecase.createAd', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new CreateAdUseCase(this.core!, repo)
    })

    container.singleton('ad.usecase.listAds', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new ListAdsUseCase(repo)
    })

    container.singleton('ad.usecase.updateAd', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new UpdateAdUseCase(this.core!, repo)
    })

    container.singleton('ad.usecase.toggleAdStatus', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new ToggleAdStatusUseCase(this.core!, repo)
    })

    container.singleton('ad.usecase.deleteAd', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new DeleteAdUseCase(this.core!, repo)
    })

    container.singleton('ad.usecase.deliverAd', (c) => {
      const repo = c.make<IAdRepository>('ad.repo.ad')
      return new DeliverAdUseCase(this.core!, repo)
    })

    // 3. 註冊 Controllers
    container.singleton('ad.controller.admin', (c) => {
      return new AdminAdController(
        c.make<CreateAdUseCase>('ad.usecase.createAd'),
        c.make<ListAdsUseCase>('ad.usecase.listAds'),
        c.make<UpdateAdUseCase>('ad.usecase.updateAd'),
        c.make<ToggleAdStatusUseCase>('ad.usecase.toggleAdStatus'),
        c.make<DeleteAdUseCase>('ad.usecase.deleteAd'),
        c.make<IAdRepository>('ad.repo.ad')
      )
    })

    container.singleton('ad.controller.public', (c) => {
      return new PublicAdController(c.make<DeliverAdUseCase>('ad.usecase.deliverAd'))
    })
  }

  /**
   * 啟動階段
   *
   * 設定 HTTP 路由
   */
  override boot(core?: PlanetCore): void {
    if (!core) {
      return
    }

    core.logger.info('Ad Satellite booting...')

    // Admin API 路由
    core.router.prefix('/api/admin/v1/ads').group((router) => {
      router.post('/', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.create(ctx)
      }) as RouteHandler)

      router.get('/', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.list(ctx)
      }) as RouteHandler)

      router.get('/:id', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.show(ctx)
      }) as RouteHandler)

      router.put('/:id', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.update(ctx)
      }) as RouteHandler)

      router.patch('/:id/status', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.toggleStatus(ctx)
      }) as RouteHandler)

      router.delete('/:id', ((ctx) => {
        const ctrl = core.container.make<AdminAdController>('ad.controller.admin')
        return ctrl.destroy(ctx)
      }) as RouteHandler)
    })

    // Public API 路由
    core.router.post('/api/v1/ads/delivery', ((ctx) => {
      const ctrl = core.container.make<PublicAdController>('ad.controller.public')
      return ctrl.deliver(ctx)
    }) as RouteHandler)

    core.router.get('/api/v1/ads/slots/:slotSlug', ((ctx) => {
      const ctrl = core.container.make<PublicAdController>('ad.controller.public')
      return ctrl.deliverBySlot(ctx)
    }) as RouteHandler)

    core.logger.info('Ad Satellite boot complete')
  }
}
