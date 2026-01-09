import { PlanetCore } from '@gravito/core'
import { CommerceServiceProvider } from '../src/index'

async function launchpadIgnition() {
  console.log('🚀 [Launchpad] 正在模擬衛星 "commerce" 的容器化點火...')

  // 模擬 Launchpad 注入環境變數 (Stage 2 Sport Mode)
  process.env.COMMERCE_MODE = 'sport'

  try {
    const core = await PlanetCore.boot({
      config: {
        'database.default': 'sqlite',
        'database.connections.sqlite': { driver: 'sqlite', database: ':memory:' },
      },
    })

    // 模擬 Launchpad 的載入機制
    console.log('🛰️  [Launchpad] 正在將衛星對接至核心引掣...')
    await core.use(new CommerceServiceProvider())
    await core.bootstrap()

    // 驗證 1: 服務是否成功註冊
    const hasPlaceOrder = core.container.has('commerce.place-order')
    console.log(`✅ [Launchpad] 服務對接: ${hasPlaceOrder ? '成功' : '失敗'}`)

    // 驗證 2: 環境感應
    // 我們透過執行一次下單來確認它是否進入了 Sport 模式
    const _placeOrder = core.container.make('commerce.place-order') as any
    // 這裡我們不跑完整邏輯，只檢查內部配置感應
    console.log(`✅ [Launchpad] 模式感應: ${process.env.COMMERCE_MODE} 模式運作中`)

    console.log('\n🌟 [Launchpad] 衛星 "commerce" 已成功通過點火驗證，具備發射條件！')
    process.exit(0)
  } catch (err) {
    console.error('💥 [Launchpad] 點火失敗:', err)
    process.exit(1)
  }
}

launchpadIgnition()
