import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Container, ServiceProvider } from '@gravito/core'
import { CouponService } from './Application/Services/CouponService'
import { PromotionEngine } from './Application/Services/PromotionEngine'
import { AdminListCoupons } from './Application/UseCases/AdminListCoupons'
import { AdminMarketingController } from './Interface/Http/Controllers/AdminMarketingController'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export class MarketingServiceProvider extends ServiceProvider {
  register(container: Container): void {
    container.singleton('marketing.promotion-engine', () => {
      return new PromotionEngine(this.core!)
    })
    container.singleton('marketing.coupon-service', () => {
      return new CouponService(this.core!)
    })
    container.bind('marketing.usecase.adminListCoupons', () => new AdminListCoupons())
    container.singleton(
      'marketing.controller.admin',
      () => new AdminMarketingController(this.core!)
    )
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

    // 管理端路由
    core.router.prefix('/api/admin/v1/marketing').group((router) => {
      router.get('/coupons', (ctx) => adminCtrl.coupons(ctx))
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
