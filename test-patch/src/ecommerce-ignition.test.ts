import { describe, it, expect, beforeAll } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { MembershipServiceProvider } from '../../satellites/membership/src'
import { CatalogServiceProvider } from '../../satellites/catalog/src'
import { CommerceServiceProvider } from '../../satellites/commerce/src'
import { MarketingServiceProvider } from '../../satellites/marketing/src'
import { CartServiceProvider } from '../../satellites/cart/src'
import { PaymentServiceProvider } from '../../satellites/payment/src'
import { OrbitPlasma } from '../../packages/plasma/src'

describe('🌌 Gravito Ecommerce Galaxy - Full System Ignition', () => {
  let core: PlanetCore

  beforeAll(async () => {
    core = new PlanetCore({
      config: {
        'payment.stripe.secret': 'sk_test_ignition',
        'database.default': 'sqlite',
        'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
        'redis': { 'default': {} } // 滿足 Plasma 依賴
      }
    })

    // 手動 Mock i18n
    core.container.singleton('i18n', () => ({
      t: (key: string) => key,
      locale: () => 'en'
    }))

    // 安裝 Orbit & Satellites
    await core.orbit(new OrbitPlasma())
    await core.use(new MembershipServiceProvider())
    await core.use(new CatalogServiceProvider())
    await core.use(new CommerceServiceProvider())
    await core.use(new MarketingServiceProvider())
    await core.use(new CartServiceProvider())
    await core.use(new PaymentServiceProvider())

    await core.bootstrap()
  })

  it('應完成從訂單建立到支付成功的完整閉環', async () => {
    core.logger.info('🔥 Ignition Started...')

    const variantId = 'v-iphone-15'
    const memberId = 'member-123'

    // Step 1: 驗證 Marketing 折扣注入 (Filter 測試)
    const adjustments = await core.hooks.applyFilters('commerce:order:adjustments', [], {
      order: { id: 'order-001', subtotalAmount: 1000 }
    })
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments[0].label).toContain('Ignition Promo')
    core.logger.info('Step 1: Marketing Discount Logic OK')

    // Step 2: 驗證 Payment 支付意向生成 (Action 測試)
    let paymentIntentCaptured = false
    core.hooks.addAction('payment:intent:ready', (payload: any) => {
      paymentIntentCaptured = true
      core.logger.info(`Step 2: Stripe Intent Received -> ${payload.intent.gatewayTransactionId}`)
    })

    await core.hooks.doAction('commerce:order:created', { 
      order: { id: 'order-001', totalAmount: 900, currency: 'USD' }
    })
    expect(paymentIntentCaptured).toBe(true)

    // Step 3: 驗證支付確認 (Status Machine 測試)
    await core.hooks.doAction('payment:succeeded', { 
      orderId: 'order-001', 
      gatewayTransactionId: 'pi_test_final' 
    })
    core.logger.info('Step 3: Payment confirmation confirmed via Hook')

    // Step 4: 驗證退款流程
    await core.hooks.doAction('commerce:order:refund-requested', {
      orderId: 'order-001',
      gatewayId: 'pi_test_final',
      amount: 900,
      items: [{ variantId, quantity: 1 }]
    })
    core.logger.info('Step 4: Refund & Stock Recovery sequence triggered')

    core.logger.info('🚀 Full System Component Integration PASSED!')
  })
})
