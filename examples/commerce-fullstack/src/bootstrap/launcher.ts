import { PhotonAdapter, PlanetCore } from '@gravito/core'
import { OrbitMonolith } from '@gravito/monolith'
import config from '../config/gravito.config'

/**
 * 內部的模組字典，將簡單的字串映射到 ServiceProvider 實體
 */
const SATELLITE_MAP: Record<string, any> = {
  catalog: () => import('@gravito/satellite-catalog').then((m) => new m.CatalogServiceProvider()),
  membership: () =>
    import('@gravito/satellite-membership').then((m) => new m.MembershipServiceProvider()),
  analytics: () =>
    import('@gravito/satellite-analytics').then((m) => new m.AnalyticsServiceProvider()),
  cms: () =>
    import('@gravito/satellite-announcement').then((m) => new m.AnnouncementServiceProvider()),
  support: () => import('@gravito/satellite-support').then((m) => new m.SupportServiceProvider()),
}

export class MonolithLauncher {
  private core = new PlanetCore({
    adapter: new PhotonAdapter(),
  })

  async ignite() {
    console.log(`🚀 [${config.name}] 正在初始化整合環境...`)

    // 註冊核心 Monolith 支持
    this.core.orbit(OrbitMonolith)

    // 依序啟動模組
    for (const moduleName of config.modules) {
      const resolver = SATELLITE_MAP[moduleName]
      if (resolver) {
        try {
          const instance = await resolver()
          // 注意：在 PlanetCore 中，註冊 Provider 的方法是 register
          this.core.register(instance)
          console.log(`   ✅ 模組點火成功: [${moduleName}]`)
        } catch (e: any) {
          console.error(`   ❌ 模組 [${moduleName}] 載入失敗: ${e.message}`)
        }
      }
    }

    const port = 3000
    this.core.liftoff(port)
    console.log(`✨ 伺服器已在 http://localhost:${port} 啟動`)
  }
}
