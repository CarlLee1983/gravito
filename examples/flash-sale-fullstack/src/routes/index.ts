import type { PlanetCore } from '@gravito/core'
import { registerPoolMonitoringRoutes } from './pool-monitoring'
import { registerReportingRoutes } from './reporting'

/**
 * 註冊所有全局路由
 */
export function registerAllRoutes(core: PlanetCore): void {
  const router = core.router

  // 註冊連接池監控路由
  registerPoolMonitoringRoutes(router)

  // 註冊報表系統路由
  registerReportingRoutes(router)
}
