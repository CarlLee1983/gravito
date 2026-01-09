import { beforeEach, describe, expect, it } from 'bun:test'
import { DB, Schema } from '@gravito/atlas'
import { PlanetCore } from '@gravito/core'
import type { PromotionEngine } from '../src/Application/Services/PromotionEngine'
import { MarketingServiceProvider } from '../src/index'

describe('Marketing Satellite - Advanced Rules', () => {
  let core: PlanetCore
  let engine: PromotionEngine

  beforeEach(async () => {
    core = await PlanetCore.boot({
      config: {
        'database.default': 'sqlite',
        'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
      },
    })
    DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })

    // 1. 模擬基礎表
    await Schema.dropIfExists('promotions')
    await Schema.create('promotions', (table) => {
      table.string('id').primary()
      table.string('name')
      table.string('type')
      table.text('configuration')
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
    })

    await Schema.dropIfExists('members')
    await Schema.create('members', (table) => {
      table.string('id').primary()
      table.string('level')
    })

    await core.use(new MarketingServiceProvider())
    await core.bootstrap()
    engine = core.container.make('marketing.promotion-engine')
  })

  it('應該能正確計算 VIP 金級會員折扣', async () => {
    // 注入金級會員
    await DB.table('members').insert({ id: 'm_gold', level: 'gold' })

    // 注入規則：金級會員 9 折 (10% off)
    await DB.table('promotions').insert({
      id: 'p_vip',
      name: 'Gold Member 10% Off',
      type: 'membership_level',
      configuration: JSON.stringify({ target_level: 'gold', discount_percent: 10 }),
      is_active: true,
    })

    const order = { id: 'o1', memberId: 'm_gold', subtotalAmount: 5000 }
    const adjustments = await engine.applyPromotions(order)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].amount).toBe(-500) // 5000 * 0.1
    expect(adjustments[0].label).toContain('GOLD Member')
  })

  it('應該能正確計算全分類折扣 (Electronics)', async () => {
    await DB.table('promotions').insert({
      id: 'p_cat',
      name: 'Electronics 20% Sale',
      type: 'category_discount',
      configuration: JSON.stringify({ category_id: 'electronics', discount_percent: 20 }),
      is_active: true,
    })

    const order = {
      subtotalAmount: 10000,
      items: [
        // 商品 A 屬於電子類 (路徑包含 /electronics/)
        { props: { totalPrice: 8000, options: { categoryPath: '/1/electronics/42/' } } },
        // 商品 B 屬於食品類
        { props: { totalPrice: 2000, options: { categoryPath: '/2/food/' } } },
      ],
    }

    const adjustments = await engine.applyPromotions(order)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].amount).toBe(-1600) // 8000 * 0.2
    expect(adjustments[0].label).toContain('ELECTRONICS')
  })

  it('應該能正確套用滿額免運折扣', async () => {
    await DB.table('promotions').insert({
      id: 'p_ship',
      name: 'Free Shipping over 1000',
      type: 'free_shipping',
      configuration: JSON.stringify({ min_amount: 1000 }),
      is_active: true,
    })

    const order = { subtotalAmount: 1500 }
    const adjustments = await engine.applyPromotions(order)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].amount).toBe(-60) // 抵銷 60 元運費
    expect(adjustments[0].label).toContain('Free Shipping')
  })
})
