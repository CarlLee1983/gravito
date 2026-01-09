import path from 'node:path'
import { DB, Schema } from '@gravito/atlas'
import { PlanetCore, setApp } from '@gravito/core'
import { OrbitSignal } from '@gravito/signal'
import type { LoginMember } from '../src/Application/UseCases/LoginMember'
import type { RegisterMember } from '../src/Application/UseCases/RegisterMember'
import { verifySingleDevice } from '../src/Interface/Http/Middleware/VerifySingleDevice'
import { MembershipServiceProvider } from '../src/index'

/**
 * 🛰️ Gravito Membership "Grand Review" (大校閱)
 *
 * 此腳本模擬全系統在 Launchpad 環境下的運行狀況
 */
async function grandReview() {
  console.log('\n🚀 [Grand Review] 啟動全系統校閱流程...')

  // 1. 初始化核心與軌道
  const core = await PlanetCore.boot({
    config: {
      APP_NAME: 'Membership Review',
      PORT: 3001,
      'membership.auth.single_device': true, // 開啟多設備限制
      'membership.branding.name': 'Review Admiral', // 自定義品牌
      'membership.branding.primary_color': '#10b981', // 自定義顏色 (綠色)
      'app.url': 'https://review.local',
      'database.default': 'sqlite',
      'database.connections.sqlite': {
        driver: 'sqlite',
        database: ':memory:',
      },
    },
    orbits: [
      new OrbitSignal({
        devMode: true,
        from: { address: 'system@gravito.dev', name: 'Gravito Core' },
        viewsDir: path.resolve(import.meta.dir, '../views'),
      }),
    ],
  })

  // 1.2 強制設置全局 app 實例，供 Mailable 內部使用
  setApp(core)

  // 1.5 初始化 Atlas
  DB.addConnection('default', {
    driver: 'sqlite',
    database: ':memory:',
  })

  // 2. 註冊服務
  core.container.instance('i18n', {
    t: (k: string) => k,
    addResource: () => {},
    on: () => {},
  })

  // 取得真正的 Repository
  const realRepo = new (
    await import('../src/Infrastructure/Persistence/AtlasMemberRepository')
  ).AtlasMemberRepository()
  core.container.instance('membership.repo', realRepo)

  // Mock Auth (Sentinel)
  const mockAuth = {
    guard: () => ({
      attempt: async () => true,
      user: async () => {
        // 從 Repo 抓出剛才註冊的人
        const members = await realRepo.findAll()
        return members[0]
      },
      logout: async () => {},
    }),
  }
  core.container.instance('auth', mockAuth)

  await core.use(new MembershipServiceProvider())
  await core.bootstrap()

  console.log('✅ [System] 核心與衛星模組已就緒。')

  // 3. 準備資料庫 (執行遷移)
  console.log('📦 [Database] 正在建立會員資料表...')
  await Schema.create('members', (table) => {
    table.string('id').primary()
    table.string('name')
    table.string('email').unique()
    table.string('password_hash')
    table.string('status').default('pending')
    table.text('roles').default('["member"]')
    table.string('verification_token').nullable()
    table.timestamp('email_verified_at').nullable()
    table.string('password_reset_token').nullable()
    table.timestamp('password_reset_expires_at').nullable()
    table.string('current_session_id').nullable()
    table.string('remember_token').nullable()
    table.timestamp('created_at').default('CURRENT_TIMESTAMP')
    table.timestamp('updated_at').nullable()
    table.text('metadata').nullable()
  })

  const _repo = core.container.make<any>('membership.repo')
  const register = core.container.make<RegisterMember>('membership.register')
  const login = core.container.make<LoginMember>('membership.login')

  // --- 測試案例 A: 註冊與郵件發送 ---
  console.log('\n🧪 [Test A] 模擬新會員註冊...')
  const email = 'commander@gravito.dev'
  await register.execute({
    name: 'Gravito Commander',
    email: email,
    passwordPlain: 'mission-critical-123',
  })

  console.log('📬 [Signal] 請檢查上方日誌，應包含美化後的 Welcome Mail HTML。')

  // --- 測試案例 B: 多設備限制 ---
  console.log('\n🧪 [Test B] 模擬多設備登入限制...')

  // 模擬 Session A
  const mockSessionA = {
    id: () => 'session_device_1',
    get: (k: string) => (k === 'login_web_auth_session' ? email : null),
    put: () => {},
    regenerate: () => {},
  }
  core.container.instance('session', mockSessionA)

  console.log('📱 設備 1 正在登入...')
  await login.execute({ email, passwordPlain: 'mission-critical-123' })

  // 模擬 Session B (另一個設備)
  const mockSessionB = {
    id: () => 'session_device_2',
    get: (k: string) => (k === 'login_web_auth_session' ? email : null),
    put: () => {},
    regenerate: () => {},
  }
  core.container.instance('session', mockSessionB)

  console.log('💻 設備 2 (新設備) 正在登入...')
  await login.execute({ email, passwordPlain: 'mission-critical-123' })

  // 模擬設備 1 的後續請求，應被攔截
  console.log('🛡️  驗證設備 1 是否被強制登出...')
  core.container.instance('session', mockSessionA) // 切換回設備 1 的環境

  // 建立模擬 Context
  const mockContext: any = {
    get: (key: string) => {
      if (key === 'core') {
        return core
      }
      return null
    },
    req: { header: () => 'application/json' },
    json: (d: any) => d,
  }

  try {
    await verifySingleDevice(mockContext, async () => {
      console.log('❌ [Fail] 設備 1 居然還能訪問！')
    })
  } catch (err: any) {
    console.log(`✅ [Pass] 設備 1 被攔截，錯誤訊息: [31m${err.message}[0m`)
  }

  console.log('\n🏁 [Grand Review] 校閱完成！所有系統運作正常。')
  process.exit(0)
}

grandReview().catch((err) => {
  console.error('💥 校閱過程中發生崩潰:', err)
  process.exit(1)
})
