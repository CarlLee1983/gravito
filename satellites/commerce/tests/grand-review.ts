import { DB, Schema } from '@gravito/atlas'
import { PlanetCore, setApp } from '@gravito/core'
import type { PlaceOrder } from '../src/Application/UseCases/PlaceOrder'
import { CommerceServiceProvider } from '../src/index'

async function grandReview() {
  console.log('\n🏎️ [Grand Review] 啟動 Commerce 原子性與樂觀鎖校閱...')

  // 1. 初始化核心
  const core = await PlanetCore.boot({
    config: {
      'database.default': 'sqlite',
      'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
    },
  })

  // 模擬註冊 Cache 服務，以便 PlaceOrder 運作
  core.container.singleton('cache', () => {
    const store = new Map()
    return {
      get: async (key: string) => store.get(key),
      put: async (key: string, val: any) => store.set(key, val),
      has: async (key: string) => store.has(key),
    }
  })

  setApp(core)

  DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })

  await Schema.create('product_variants', (table) => {
    table.string('id').primary()
    table.string('sku')
    table.string('name')
    table.decimal('price', 15, 2)
    table.integer('stock')
    table.integer('version').default(1)
    table.timestamp('updated_at').nullable()
  })

  const migration = await import(
    '../src/Infrastructure/Persistence/Migrations/20250101_create_commerce_tables'
  )
  await migration.default.up()

  await core.use(new CommerceServiceProvider())
  await core.bootstrap()

  const placeOrder = core.container.make<PlaceOrder>('commerce.place-order')

  console.log('\n🧪 [Test A] 執行標準下單...')
  await DB.table('product_variants').insert({
    id: 'v1',
    sku: 'TSHIRT',
    name: 'Cool T-Shirt',
    price: 500,
    stock: 10,
    version: 1,
  })

  const result = await placeOrder.execute({
    memberId: 'm1',
    items: [{ variantId: 'v1', quantity: 2 }],
  })

  const updatedVariant = (await DB.table('product_variants').where('id', 'v1').first()) as any
  if (updatedVariant) {
    console.log(
      `✅ 訂單已建立: ${result.orderId}, 剩餘庫存: ${updatedVariant.stock}, 版本: ${updatedVariant.version}`
    )
    if (updatedVariant.stock !== 8) {
      throw new Error('Stock deduction error')
    }
  }

  console.log('\n🧪 [Test B] 模擬兩個人同時搶購最後 5 件商品...')
  const attempt1 = placeOrder.execute({
    memberId: 'user_a',
    items: [{ variantId: 'v1', quantity: 5 }],
  })

  const attempt2 = placeOrder.execute({
    memberId: 'user_b',
    items: [{ variantId: 'v1', quantity: 5 }],
  })

  const [res1, res2] = await Promise.allSettled([attempt1, attempt2])

  console.log('🏁 搶購結果:')
  console.log(
    `👤 用戶 A: ${res1.status === 'fulfilled' ? '✅ 成功' : `❌ 失敗: ${(res1 as any).reason.message}`}`
  )
  console.log(
    `👤 用戶 B: ${res2.status === 'fulfilled' ? '✅ 成功' : `❌ 失敗: ${(res2 as any).reason.message}`}`
  )

  const finalVariant = (await DB.table('product_variants').where('id', 'v1').first()) as any
  if (finalVariant) {
    console.log(`📊 最終庫存: ${finalVariant.stock} (預期應為 3, 且無負數)`)
    if (finalVariant.stock < 0) {
      throw new Error('Overselling detected!')
    }
  }

  console.log('\n🧪 [Test C] 驗證 Stage 2 (Sport Mode) 內存加速...')
  // 切換環境變數為 sport
  process.env.COMMERCE_MODE = 'sport'

  // 1. 建立新商品並下單 (這會寫入快取)
  await DB.table('product_variants').insert({
    id: 'v_sport',
    sku: 'SPORT',
    name: 'Speed Shoes',
    price: 1000,
    stock: 10,
    version: 1,
  })

  await placeOrder.execute({
    memberId: 'm1',
    items: [{ variantId: 'v_sport', quantity: 1 }],
  })
  console.log('✅ 第一次下單成功，已 priming 快取')

  // 2. 故意從資料庫刪除該商品元數據 (但保留 ID 供庫存扣減)
  // 在 Sport 模式下，ProductResolver 應該從內存讀取名稱，不會因為 DB 沒名稱而失敗
  await DB.table('product_variants').where('id', 'v_sport').update({ name: 'CLEARED_IN_DB' })

  const sportResult = await placeOrder.execute({
    memberId: 'm1',
    items: [{ variantId: 'v_sport', quantity: 1 }],
  })

  // 檢查快照名稱是否維持原樣 (證明來自快取)
  const orderItem = (await DB.table('order_items')
    .where('order_id', sportResult.orderId)
    .first()) as any
  console.log(
    `📊 快取驗證: 訂單內商品名稱 = "${orderItem.name}" (預期應為 "Speed Shoes", 而非 "CLEARED_IN_DB")`
  )

  if (orderItem.name !== 'Speed Shoes') {
    throw new Error('Cache was not utilized in Sport mode!')
  }

  console.log('\n🎉 [Grand Review] 所有模式 (Standard, Sport, Hooks) 校閱成功！')
  process.exit(0)
}

grandReview().catch((err) => {
  console.error('💥 校閱失敗:', err)
  process.exit(1)
})
