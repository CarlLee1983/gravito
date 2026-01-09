import { DB } from '@gravito/atlas'
import { PlanetCore, setApp } from '@gravito/core'
import { CartServiceProvider } from '../src/index'

async function cartGrandReview() {
  console.log('\n🌟 [Cart Grand Review] 啟動購物車持久化與自動合併校閱...')

  // 1. 初始化核心與資料庫
  const core = await PlanetCore.boot({
    config: {
      'database.default': 'sqlite',
      'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
    },
  })
  setApp(core)
  DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })

  // 2. 執行遷移
  const migration = await import(
    '../src/Infrastructure/Persistence/Migrations/20250101_create_cart_tables'
  )
  await migration.default.up()

  // 3. 註冊插件
  await core.use(new CartServiceProvider())
  await core.bootstrap()

  const addItem = core.container.make<any>('cart.add-item')

  // --- 測試場景 A: 訪客加購 ---
  console.log('🧪 [Test A] 訪客 (guest_123) 加入商品 v1 x 2...')
  await addItem.execute({ guestId: 'guest_123', variantId: 'v1', quantity: 2 })

  // --- 測試場景 B: 會員登入 (觸發合併) ---
  console.log('🧪 [Test B] 會員 (member_456) 登入，觸發合併事件...')
  // 模擬 Membership 發出的事件
  await core.hooks.doAction('member:logged-in', {
    memberId: 'member_456',
    guestId: 'guest_123',
  })

  // --- 測試場景 C: 驗證結果 ---
  console.log('🧪 [Test C] 驗證會員購物車內容...')
  const repo = core.container.make<any>('cart.repository')
  const memberCart = await repo.find({ memberId: 'member_456' })

  if (memberCart && memberCart.items.length > 0) {
    console.log(`✅ 合併成功！會員購物車品項數: ${memberCart.items.length}`)
    console.log(
      `   - 品項 ID: ${memberCart.items[0].props.variantId}, 數量: ${memberCart.items[0].props.quantity}`
    )

    if (memberCart.items[0].props.quantity !== 2) {
      throw new Error('Quantity mismatch after merge')
    }
  } else {
    throw new Error('Merge failed: Member cart is empty')
  }

  // 檢查訪客購物車是否已被刪除
  const guestCart = await repo.find({ guestId: 'guest_123' })
  if (guestCart) {
    throw new Error('Guest cart was not cleaned up after merge')
  }
  console.log('✅ 訪客購物車已成功清理 (Privacy Protection)')

  console.log('\n🎉 [Cart Grand Review] 購物車衛星校閱成功！')
  process.exit(0)
}

cartGrandReview().catch((err) => {
  console.error('💥 校閱失敗:', err)
  process.exit(1)
})
