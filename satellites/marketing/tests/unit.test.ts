import { beforeEach, describe, expect, it } from 'bun:test'
import { DB, Schema } from '@gravito/atlas'
import { PlanetCore } from '@gravito/core'
import type { CouponService } from '../src/Application/Services/CouponService'
import type { PromotionEngine } from '../src/Application/Services/PromotionEngine'
import { MarketingServiceProvider } from '../src/index'

describe('Marketing Satellite - Coupon & Promotion', () => {
  let core: PlanetCore
  let promoEngine: PromotionEngine
  let couponService: CouponService

  beforeEach(async () => {
    core = await PlanetCore.boot({
      config: {
        'database.default': 'sqlite',
        'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
      },
    })
    DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })

    await Schema.dropIfExists('promotions')
    await Schema.create('promotions', (table) => {
      table.string('id').primary()
      table.string('name')
      table.string('type')
      table.text('configuration')
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
    })

    await Schema.dropIfExists('coupons')
    await Schema.create('coupons', (table) => {
      table.string('id').primary()
      table.string('code').unique()
      table.string('name')
      table.string('type')
      table.decimal('value', 15, 2)
      table.text('configuration').nullable()
      table.integer('usage_limit').nullable()
      table.integer('usage_count').default(0)
      table.boolean('is_active').default(true)
      table.timestamp('expires_at').nullable()
    })

    await core.use(new MarketingServiceProvider())
    await core.bootstrap()

    promoEngine = core.container.make('marketing.promotion-engine')
    couponService = core.container.make('marketing.coupon-service')
  })

  it('應該能正確套用固定金額折價券', async () => {
    await DB.table('coupons').insert({
      id: 'c1',
      code: 'SAVE100',
      name: 'Welcome Pack',
      type: 'fixed',
      value: 100,
      is_active: true,
    })

    const order = { subtotalAmount: 1000 }
    const adj = await couponService.getAdjustment('SAVE100', order)

    expect(adj?.amount).toBe(-100)
    expect(adj?.label).toContain('Welcome Pack')
  })

  it('應該能正確套用百分比折價券', async () => {
    await DB.table('coupons').insert({
      id: 'c2',
      code: 'OFF10',
      name: '10% Discount',
      type: 'percent',
      value: 10,
      is_active: true,
    })

    const order = { subtotalAmount: 2000 }
    const adj = await couponService.getAdjustment('OFF10', order)

    expect(adj?.amount).toBe(-200) // 2000 * 0.1
  })

  it('當折價券過期時應拋出錯誤', async () => {
    await DB.table('coupons').insert({
      id: 'c3',
      code: 'EXPIRED',
      name: 'Old Coupon',
      type: 'fixed',
      value: 100,
      expires_at: '2020-01-01',
      is_active: true,
    })

    const order = { subtotalAmount: 1000 }
    expect(couponService.getAdjustment('EXPIRED', order)).rejects.toThrow('expired')
  })

  it('應該能正確計算買 2 送 1 (Buy X Get Y)', async () => {
    await DB.table('promotions').insert({
      id: 'p3',
      name: 'B2G1 Free',
      type: 'buy_x_get_y',
      configuration: JSON.stringify({ target_sku: 'TEST_SKU', x: 2, y: 1 }),
      is_active: true,
    })

    const order = {
      items: [{ props: { sku: 'TEST_SKU', quantity: 2, unitPrice: 500 } }],
    }

    const adjustments = await promoEngine.applyPromotions(order)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].amount).toBe(-500) // 免費送一個 500 元的商品
    expect(adjustments[0].label).toContain('Free')
  })
})
