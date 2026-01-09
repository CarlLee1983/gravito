import { GravitoServer } from '@gravito/core'
import { OrbitMonolith } from '@gravito/monolith'
import manifest from './config/gravito.config'

/**
 * 1.0 整合啟動入口
 * 透過 GravitoServer 引擎一鍵點火，並傳入基礎設施軌道
 */
const app = await GravitoServer.create(
  manifest,
  {
    catalog: () => import('@gravito/satellite-catalog').then((m) => m.CatalogServiceProvider),
    membership: () =>
      import('@gravito/satellite-membership').then((m) => m.MembershipServiceProvider),
    analytics: () => import('@gravito/satellite-analytics').then((m) => m.AnalyticsServiceProvider),
    cms: () => import('@gravito/satellite-announcement').then((m) => m.AnnouncementServiceProvider),
    support: () => import('@gravito/satellite-support').then((m) => m.SupportServiceProvider),
  },
  [OrbitMonolith]
) // 這裡傳入 Monolith 支持

app.liftoff(3000)
