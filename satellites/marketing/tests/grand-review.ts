import { DB, Schema } from '@gravito/atlas'
import { PlanetCore, setApp } from '@gravito/core'
import { CommerceServiceProvider } from '../../commerce/src/index'
import { MarketingServiceProvider } from '../src/index'

async function marketingGrandReview() {
  console.log('\n🌟 [Marketing Grand Review] 啟動跨模組行銷聯動校閱...')

  // 直接對 Atlas 進行底層配置
  DB.configure({
    default: 'sqlite',
    connections: {
      sqlite: { driver: 'sqlite', database: ':memory:' },
    },
  })

  // 1. 初始化核心
  const core = await PlanetCore.boot({
    config: {
      'database.default': 'sqlite',
      'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
    },
  })
  setApp(core)

  console.log('📦 [Database] 準備資料表...')
  // 使用 Atlas 靜態物件執行
  await Schema.create('product_variants', (table) => {
    table.string('id').primary()
    table.string('sku')
    table.string('name')
    table.decimal('price', 15, 2)
    table.integer('stock')
    table.integer('version').default(1)
    table.timestamp('updated_at').nullable()
  })

  // 執行遷移
  const commMigration = await import(
    '../../commerce/src/Infrastructure/Persistence/Migrations/20250101_create_commerce_tables'
  )
  await commMigration.default.up()

  const mktMigration = await import(
    '../src/Infrastructure/Persistence/Migrations/20250101_create_marketing_tables'
  )
  await mktMigration.default.up()

  // 2. 註冊插件
  await core.use(new CommerceServiceProvider())
  await core.use(new MarketingServiceProvider())
  await core.bootstrap()

  // 3. 設定促銷規則
  await DB.table('promotions').insert({
    id: 'promo_1',
    name: 'Grand Opening Sale',
    type: 'cart_threshold',
    configuration: JSON.stringify({ min_amount: 2000, discount: 200 }),
    priority: 100,
    is_active: true,
  })

  // 4. 下單驗證
  await DB.table('product_variants').insert({
    id: 'v1',
    sku: 'IPHONE',
    name: 'iPhone 16 Pro',
    price: 30000,
    stock: 10,
    version: 1,
  })

  const placeOrder = core.container.make<any>('commerce.place-order')
  console.log('\n🧪 [Test] 執行下單...')
  const result = await placeOrder.execute({
    memberId: 'user_1',
    items: [{ variantId: 'v1', quantity: 1 }],
  })

  const order = (await DB.table('orders').where('id', result.orderId).first()) as any
  console.log(`✅ 訂單驗證完成: ${order.total_amount}`)

  if (Number(order.total_amount) !== 29860) {
    throw new Error('Calculation mismatch!')
  }

  console.log('\n🎉 [Marketing Grand Review] 跨模組驗證圓滿成功!')
  process.exit(0)
}

marketingGrandReview().catch((err) => {
  console.error('💥 校閱失敗:', err)
  process.exit(1)
})
