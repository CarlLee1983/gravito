import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Container, ServiceProvider } from '@gravito/core'
import { CouponService } from './Application/Services/CouponService'
import { PromotionEngine } from './Application/Services/PromotionEngine'
import {
  AdminListCoupons,
  CreatePromotion,
  DeactivatePromotion,
  GetCoupon,
  GetPromotion,
  IssueCoupon,
  ListCoupons,
  ListPromotions,
  RedeemCoupon,
  ValidateCoupon,
} from './Application/UseCases'
import {
  ApplyPromotionContext,
  CreatePromotionContext,
  DeactivatePromotionContext,
  IssueCouponContext,
  RedeemCouponContext,
  ValidateCouponContext,
} from './Domain/DCI/Contexts'
import {
  AtlasCouponRepository,
  AtlasPromotionRepository,
} from './Infrastructure/Persistence/Repositories'
import {
  AdminMarketingController,
  CouponController,
  PromotionController,
} from './Interface/Http/Controllers'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export class MarketingServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 1. Repositories
    container.singleton('marketing.repository.coupon', () => {
      return new AtlasCouponRepository()
    })
    container.singleton('marketing.repository.promotion', () => {
      return new AtlasPromotionRepository()
    })

    // 2. DCI Contexts
    container.singleton('marketing.context.issue-coupon', () => {
      return new IssueCouponContext(container.make('marketing.repository.coupon'))
    })
    container.singleton('marketing.context.validate-coupon', () => {
      return new ValidateCouponContext(container.make('marketing.repository.coupon'))
    })
    container.singleton('marketing.context.redeem-coupon', () => {
      return new RedeemCouponContext(container.make('marketing.repository.coupon'))
    })
    container.singleton('marketing.context.apply-promotion', () => {
      return new ApplyPromotionContext(container.make('marketing.repository.promotion'))
    })
    container.singleton('marketing.context.create-promotion', () => {
      return new CreatePromotionContext(container.make('marketing.repository.promotion'))
    })
    container.singleton('marketing.context.deactivate-promotion', () => {
      return new DeactivatePromotionContext(container.make('marketing.repository.promotion'))
    })

    // 3. UseCases
    container.bind('marketing.usecase.admin-list-coupons', () => {
      return new AdminListCoupons()
    })
    container.bind('marketing.usecase.issue-coupon', () => {
      return new IssueCoupon(container.make('marketing.repository.coupon'))
    })
    container.bind('marketing.usecase.validate-coupon', () => {
      return new ValidateCoupon(container.make('marketing.repository.coupon'))
    })
    container.bind('marketing.usecase.redeem-coupon', () => {
      return new RedeemCoupon(container.make('marketing.repository.coupon'))
    })
    container.bind('marketing.usecase.get-coupon', () => {
      return new GetCoupon(container.make('marketing.repository.coupon'))
    })
    container.bind('marketing.usecase.list-coupons', () => {
      return new ListCoupons(container.make('marketing.repository.coupon'))
    })
    container.bind('marketing.usecase.create-promotion', () => {
      return new CreatePromotion(container.make('marketing.repository.promotion'))
    })
    container.bind('marketing.usecase.deactivate-promotion', () => {
      return new DeactivatePromotion(container.make('marketing.repository.promotion'))
    })
    container.bind('marketing.usecase.get-promotion', () => {
      return new GetPromotion(container.make('marketing.repository.promotion'))
    })
    container.bind('marketing.usecase.list-promotions', () => {
      return new ListPromotions(container.make('marketing.repository.promotion'))
    })

    // 4. Services (legacy)
    container.singleton('marketing.promotion-engine', () => {
      return new PromotionEngine(this.core!)
    })
    container.singleton('marketing.coupon-service', () => {
      return new CouponService(this.core!)
    })

    // 5. Controllers
    container.singleton('marketing.controller.admin', () => {
      return new AdminMarketingController(this.core!)
    })
    container.singleton('marketing.controller.coupon', () => {
      return new CouponController(this.core!)
    })
    container.singleton('marketing.controller.promotion', () => {
      return new PromotionController(this.core!)
    })
  }

  getMigrationsPath(): string {
    return join(__dirname, 'Infrastructure/Persistence/Migrations')
  }

  override async boot(): Promise<void> {
    const core = this.core
    if (!core) {
      return
    }

    const adminCtrl = core.container.make<AdminMarketingController>('marketing.controller.admin')
    const couponCtrl = core.container.make<CouponController>('marketing.controller.coupon')
    const promoCtrl = core.container.make<PromotionController>('marketing.controller.promotion')

    // 管理端路由
    core.router.prefix('/api/admin/v1/marketing').group((router) => {
      router.get('/coupons', (ctx) => adminCtrl.coupons(ctx))
    })

    // 客戶端優惠券路由
    core.router.prefix('/api/v1/coupons').group((router) => {
      router.post('/', (ctx) => couponCtrl.issue(ctx))
      router.get('/:id', (ctx) => couponCtrl.get(ctx))
      router.get('/', (ctx) => couponCtrl.list(ctx))
      router.post('/:code/validate', (ctx) => couponCtrl.validate(ctx))
      router.post('/:code/redeem', (ctx) => couponCtrl.redeem(ctx))
    })

    // 管理端促銷活動路由
    core.router.prefix('/api/admin/v1/promotions').group((router) => {
      router.post('/', (ctx) => promoCtrl.create(ctx))
      router.get('/:id', (ctx) => promoCtrl.get(ctx))
      router.get('/', (ctx) => promoCtrl.list(ctx))
      router.patch('/:id/deactivate', (ctx) => promoCtrl.deactivate(ctx))
    })

    const promoEngine = core.container.make<PromotionEngine>('marketing.promotion-engine')
    const couponService = core.container.make<CouponService>('marketing.coupon-service')

    // 1. 價格調整 Filter (Promotion + Coupon)
    core.hooks.addFilter(
      'commerce:order:adjustments',
      async (adjustments: any[], { order, extras }: any) => {
        core.logger.info(`🎯 [Marketing] 正在為訂單 ${order.id} 掃描促銷與折價券...`)

        const results = [...adjustments]

        // 自動套用促銷活動
        const promoAdjustments = await promoEngine.applyPromotions(order)
        results.push(...promoAdjustments)

        // 手動套用折價券 (從下單請求的 extras 中獲取 couponCode)
        if (extras?.couponCode) {
          try {
            const couponAdj = await couponService.getAdjustment(extras.couponCode, order)
            if (couponAdj) {
              results.push(couponAdj)
            }
          } catch (e: any) {
            core.logger.warn(`⚠️ [Marketing] 折價券無效: ${e.message}`)
            // 注意：這裡我們不拋出錯誤，讓下單繼續但沒有折扣
          }
        }

        return results
      }
    )

    // 2. 訂單完成後的核銷動作
    core.hooks.addAction('commerce:order-placed', async (payload: any) => {
      core.logger.info(`📝 [Marketing] 訂單 ${payload.orderId} 已建立，正在處理折價券核銷...`)
    })

    core.logger.info('🛰️ Satellite Marketing is operational')
  }
}
